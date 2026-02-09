// app/api/stripe/webhook/route.js
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function toIsoFromUnix(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// ✅ Define which Stripe statuses count as access
function computeAccessFromStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "active" || s === "trialing";
}

// ✅ Map priceId => plan label (adjust to your price IDs or envs)
function planFromPriceId(priceId) {
  const monthly = process.env.STRIPE_PRICE_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_YEARLY;

  if (!priceId) return "Paid";
  if (monthly && priceId === monthly) return "Monthly";
  if (yearly && priceId === yearly) return "Yearly";
  return "Paid";
}

async function upsertSubscriptionRow({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  priceId,
  currentPeriodEnd,
}) {
  const admin = supabaseAdmin();

  const access = computeAccessFromStatus(status);
  const plan = planFromPriceId(priceId);

  const { error } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: String(status || "unknown"),
        access,
        plan,
        price_id: priceId,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

async function updateByCustomerId({
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  priceId,
  currentPeriodEnd,
}) {
  const admin = supabaseAdmin();

  const access = computeAccessFromStatus(status);
  const plan = planFromPriceId(priceId);

  const { error } = await admin
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      status: String(status || "unknown"),
      access,
      plan,
      price_id: priceId,
      current_period_end: currentPeriodEnd,
    })
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) throw error;
}

async function handleSubscriptionObject(sub) {
  const stripeCustomerId = String(sub.customer || "");
  const stripeSubscriptionId = sub.id;
  const status = sub.status || "incomplete";
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const currentPeriodEnd = toIsoFromUnix(sub.current_period_end);

  // Prefer metadata mapping
  const userIdFromMeta = sub.metadata?.supabase_user_id || sub.metadata?.supabase_uid || null;

  if (userIdFromMeta) {
    await upsertSubscriptionRow({
      userId: userIdFromMeta,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      priceId,
      currentPeriodEnd,
    });
    return;
  }

  // Fallback: best-effort update by customer id
  await updateByCustomerId({
    stripeCustomerId,
    stripeSubscriptionId,
    status,
    priceId,
    currentPeriodEnd,
  });
}

async function handleCheckoutSessionCompleted(session) {
  // ✅ This is the best event to link user ↔ customer ↔ subscription
  const userId =
    session?.metadata?.supabase_user_id ||
    session?.subscription_data?.metadata?.supabase_user_id ||
    null;

  const stripeCustomerId = String(session.customer || "");
  const stripeSubscriptionId = String(session.subscription || "");

  if (!userId || !stripeSubscriptionId) return;

  // Fetch full subscription (status, items, period end)
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const status = sub.status || "incomplete";
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const currentPeriodEnd = toIsoFromUnix(sub.current_period_end);

  await upsertSubscriptionRow({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    status,
    priceId,
    currentPeriodEnd,
  });
}

export async function POST(req) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !secret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

    // 1) Best: checkout completion links everything reliably
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event.data.object);
      return NextResponse.json({ received: true });
    }

    // 2) Subscription lifecycle events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionObject(event.data.object);
      return NextResponse.json({ received: true });
    }

    // 3) Invoice events help keep status accurate
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
        await handleSubscriptionObject(sub);
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 400 });
  }
}
