// app/api/stripe/checkout/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_MONTHLY = "price_1SuOMyA0KYJ0htSxcZPG0Vkg"; // 7-day trial
const PRICE_YEARLY = "price_1SuOMyA0KYJ0htSxF9os18YO"; // no trial

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env var");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL env var");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function getBearerToken(req) {
  const auth = req.headers.get("authorization") || "";
  const [type, token] = auth.split(" ");
  if (type === "Bearer" && token) return token;
  return null;
}

export async function POST(req) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId;

    if (![PRICE_MONTHLY, PRICE_YEARLY].includes(priceId)) {
      return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Verify user from token
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    // Get existing customer id if present
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

      // ✅ IMPORTANT: sync after checkout, THEN send to dashboard
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?billing=canceled`,

      metadata: {
        supabase_user_id: user.id,
        selected_price_id: priceId,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    };

    // Monthly gets 7-day trial; yearly gets none
    if (priceId === PRICE_MONTHLY) {
      sessionParams.subscription_data.trial_period_days = 7;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Stripe checkout error" }, { status: 500 });
  }
}
