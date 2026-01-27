// app/api/stripe/portal/route.js
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });

    const sbAdmin = supabaseAdmin();

    const { data, error } = await sbAdmin
      .from("stripe_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw error;

    const customerId = data?.stripe_customer_id;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Portal error" }, { status: 500 });
  }
}
