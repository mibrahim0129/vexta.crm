// app/pricing/page.js
import Link from "next/link";

export const metadata = {
  title: "Pricing | Vexta",
};

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
        Vexta Pricing
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Start simple. Upgrade anytime.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <PlanCard
          name="Starter"
          price="$29/mo"
          bullets={[
            "Contacts + notes",
            "Deals pipeline",
            "Basic tasks",
            "Email support",
          ]}
          cta="Choose Starter"
          href="/checkout?plan=starter"
        />

        <PlanCard
          name="Pro"
          price="$79/mo"
          bullets={[
            "Everything in Starter",
            "Activity timeline",
            "Team-ready features (coming soon)",
            "Priority support",
          ]}
          cta="Choose Pro"
          href="/checkout?plan=pro"
          featured
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard" style={{ textDecoration: "underline" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function PlanCard({ name, price, bullets, cta, href, featured }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 18,
        boxShadow: featured ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{name}</h2>
        {featured ? (
          <span
            style={{
              fontSize: 12,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid #111",
            }}
          >
            Most popular
          </span>
        ) : null}
      </div>

      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
        {price}
      </div>

      <ul style={{ marginTop: 12, paddingLeft: 18, lineHeight: 1.8 }}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <Link
        href={href}
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #111",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        {cta}
      </Link>
    </div>
  );
}
