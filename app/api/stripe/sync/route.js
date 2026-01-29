// app/api/stripe/sync/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

function toIsoFromUnix(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

export async function POST(req) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = body?.session_id;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Verify user from token
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const stripe = getStripe();

    // Pull session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const stripeCustomerId = String(session.customer || "");
    const stripeSubscriptionId = String(session.subscription || "");

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No subscription on this checkout session yet" },
        { status: 409 }
      );
    }

    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const status = sub.status || "incomplete";
    const priceId = sub.items?.data?.[0]?.price?.id ?? null;
    const currentPeriodEnd = toIsoFromUnix(sub.current_period_end);

    await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status,
          price_id: priceId,
          current_period_end: currentPeriodEnd,
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Sync error" }, { status: 500 });
  }
}
