// app/api/stripe/sync/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
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
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const admin = supabaseAdmin();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const stripe = getStripe();

    const checkout = await stripe.checkout.sessions.retrieve(session_id);
    const stripeCustomerId = checkout.customer;
    const stripeSubscriptionId = checkout.subscription;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer on checkout session." }, { status: 400 });
    }

    // If subscription exists, pull details
    let status = "none";
    let price_id = null;
    let current_period_end = null;

    if (stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      status = sub.status || "none";
      price_id = sub.items?.data?.[0]?.price?.id || null;
      current_period_end = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
    }

    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: String(stripeCustomerId),
        stripe_subscription_id: stripeSubscriptionId ? String(stripeSubscriptionId) : null,
        status,
        price_id,
        current_period_end,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Sync error" }, { status: 500 });
  }
}
