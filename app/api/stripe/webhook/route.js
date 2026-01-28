import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function upsertFromSubscription(sub) {
  const admin = supabaseAdmin();

  const stripeCustomerId = sub.customer;
  const stripeSubscriptionId = sub.id;
  const status = sub.status;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // Try to find the user via metadata first
  const userIdFromMeta = sub.metadata?.supabase_user_id || null;

  if (userIdFromMeta) {
    await admin.from("subscriptions").upsert(
      {
        user_id: userIdFromMeta,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status,
        price_id: priceId,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "user_id" }
    );
    return;
  }

  // Fallback: match existing row by stripe_customer_id
  await admin
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      status,
      price_id: priceId,
      current_period_end: currentPeriodEnd,
    })
    .eq("stripe_customer_id", stripeCustomerId);
}

export async function POST(req) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      return NextResponse.json({ error: "Missing webhook signature/secret" }, { status: 400 });
    }

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

    // Handle subscription lifecycle
    if (event.type === "customer.subscription.created") {
      await upsertFromSubscription(event.data.object);
    }

    if (event.type === "customer.subscription.updated") {
      await upsertFromSubscription(event.data.object);
    }

    if (event.type === "customer.subscription.deleted") {
      await upsertFromSubscription(event.data.object);
    }

    // Optional but useful for “active/past_due” accuracy
    if (event.type === "invoice.paid") {
      // On paid invoices, Stripe typically updates subscription status anyway,
      // but we keep it to stay in sync.
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await upsertFromSubscription(sub);
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await upsertFromSubscription(sub);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Webhook error" },
      { status: 400 }
    );
  }
}
