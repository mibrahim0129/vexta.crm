// app/api/stripe/portal/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env var");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
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
    const returnTo = body?.returnTo || "/dashboard/settings?billing=portal_return";

    const admin = supabaseAdmin();

    // Verify user from token
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Take latest row (in case duplicates exist)
    const { data: rows, error: rowErr } = await admin
      .from("subscriptions")
      .select("stripe_customer_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (rowErr) {
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }

    let stripeCustomerId = rows?.[0]?.stripe_customer_id || null;

    const stripe = getStripe();

    // If missing, create customer so portal always works
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Store placeholder (NO FREE TIER → access stays false)
      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            status: "incomplete",
            access: false,
            plan: "None",
            price_id: null,
          },
          { onConflict: "user_id" }
        );
    }

    const appUrl = getAppUrl();
    const safeReturn = String(returnTo || "/dashboard/settings").startsWith("/")
      ? String(returnTo)
      : `/${String(returnTo)}`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}${safeReturn}`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Portal error" }, { status: 500 });
  }
}
