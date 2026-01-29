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

    // Fetch the LATEST subscription row for this user (prevents grabbing wrong/old row)
    const { data: subs, error: subsErr } = await admin
      .from("subscriptions")
      .select("status, stripe_customer_id, stripe_subscription_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subsErr) {
      return NextResponse.json({ error: "Failed to read subscription" }, { status: 500 });
    }

    const latest = subs?.[0] || null;

    // If they already have access, do NOT create another subscription — send to billing portal
    const okStatuses = new Set(["active", "trialing", "past_due"]);
    if (latest?.status && okStatuses.has(latest.status) && latest?.stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: latest.stripe_customer_id,
        return_url: `${appUrl}/dashboard/settings?billing=portal_return`,
      });
      return NextResponse.json({ url: portal.url, kind: "portal" });
    }

    // Determine Stripe customer id
    let stripeCustomerId = latest?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Store customer id so future checkouts/portal work.
      // NOTE: This is a pragmatic approach with your current schema.
      // Long-term, we should move stripe_customer_id to a dedicated "customers" table.
      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            // Do NOT force a fake "subscription" state here; just keep a placeholder.
            status: latest?.status || "incomplete",
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

      // ✅ send to a success buffer page (prevents redirect loops while webhook finalizes)
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
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
    return NextResponse.json({ url: session.url, kind: "checkout" });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Stripe checkout error" }, { status: 500 });
  }
}
