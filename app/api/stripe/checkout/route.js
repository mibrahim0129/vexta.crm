import Stripe from "stripe";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const PRICE_MONTHLY = "price_1SuOMyA0KYJ0htSxcZPG0Vkg";
const PRICE_YEARLY = "price_1SuOMyA0KYJ0htSxF9os18YO";

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function supabaseServer() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase public env vars.");
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route handlers can throw on set in some edge cases; safe to ignore.
        }
      },
    },
  });
}

export async function POST(req) {
  try {
    const sb = supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId;

    if (![PRICE_MONTHLY, PRICE_YEARLY].includes(priceId)) {
      return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
    }

    const appUrl = getAppUrl();
    const admin = supabaseAdmin();

    // Get or create Stripe customer id for this user
    const { data: subRow } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subRow?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Upsert record so portal + webhook always has a row
      await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          status: "incomplete",
          price_id: priceId,
        },
        { onConflict: "user_id" }
      );
    }

    const sessionParams = {
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=canceled`,
      // IMPORTANT: link Stripe events back to your user
      metadata: {
        supabase_user_id: user.id,
        selected_price_id: priceId,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    };

    // Monthly gets 7-day trial; Yearly gets none
    if (priceId === PRICE_MONTHLY) {
      sessionParams.subscription_data.trial_period_days = 7;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Stripe checkout error" },
      { status: 500 }
    );
  }
}
