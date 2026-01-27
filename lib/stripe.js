// lib/stripe.js
import Stripe from "stripe";

let cached = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  // Don't throw at import-time / build-time.
  // If key is missing, return null and let routes respond nicely.
  if (!key) return null;

  if (!cached) {
    cached = new Stripe(key, { apiVersion: "2024-06-20" });
  }

  return cached;
}
