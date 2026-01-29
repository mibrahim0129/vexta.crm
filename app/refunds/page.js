// app/refunds/page.js
import Link from "next/link";

export default function RefundsPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0 }}>Refund Policy</h1>
      <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
        Effective date: {new Date().toLocaleDateString()}
      </p>

      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950 }}>Trials</h2>
        <p style={{ opacity: 0.9 }}>
          If your plan includes a free trial, you can cancel during the trial to avoid being charged.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>Refunds</h2>
        <p style={{ opacity: 0.9 }}>
          Refunds are evaluated case-by-case. If you believe you were charged in error, contact support
          with your account email and the date of charge.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>How to cancel</h2>
        <p style={{ opacity: 0.9 }}>
          You can cancel anytime from Settings → Manage Billing (Stripe portal).
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/pricing" style={{ textDecoration: "underline", fontWeight: 800 }}>
          Back to Pricing
        </Link>
      </div>
    </div>
  );
}
