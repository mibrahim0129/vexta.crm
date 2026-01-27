// app/api/stripe/checkout/route.js
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY env var" },
        { status: 500 }
      );
    }

    const { user_id, email, priceId } = await req.json();

    if (!user_id || !email || !priceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });
    }

    const sbAdmin = supabaseAdmin();

    const { data: existing, error: readErr } = await sbAdmin
      .from("stripe_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (readErr) throw readErr;

    let customerId = existing?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id },
      });
      customerId = customer.id;

      const { error: upErr } = await sbAdmin.from("stripe_subscriptions").upsert({
        user_id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });

      if (upErr) throw upErr;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/billing?success=1`,
      cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id } },
      metadata: { user_id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Checkout error" }, { status: 500 });
  }
}
