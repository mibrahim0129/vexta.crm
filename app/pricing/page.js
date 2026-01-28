// app/pricing/page.js
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const PRICE_MONTHLY = "price_1SuOMyA0KYJ0htSxcZPG0Vkg";
const PRICE_YEARLY = "price_1SuOMyA0KYJ0htSxF9os18YO";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState(""); // "monthly" | "yearly" | ""
  const [err, setErr] = useState("");

  const monthly = useMemo(
    () => ({
      label: "Monthly",
      price: "$29",
      sub: "/month",
      kicker: "7-day free trial",
      kickerNote: "Card required • Cancel anytime during trial",
      highlight: "Start your 7-day free trial today",
      bullets: [
        "Full CRM access during trial",
        "Contacts, deals, notes, tasks",
        "Pipeline + activity tracking",
        "Email support",
      ],
      priceId: PRICE_MONTHLY,
      cta: "Start 7-day free trial",
      badge: "Best to start",
      featured: true,
    }),
    []
  );

  const yearly = useMemo(
    () => ({
      label: "Yearly",
      price: "$290",
      sub: "/year",
      kicker: "2 months free",
      kickerNote: "Save vs monthly • Billed yearly",
      highlight: "Save 2 months when you go yearly",
      bullets: [
        "Everything in Monthly",
        "Best value for serious agents",
        "Priority support",
        "One invoice for the year",
      ],
      priceId: PRICE_YEARLY,
      cta: "Get 2 months free (Yearly)",
      badge: "Best value",
      featured: false,
    }),
    []
  );

  async function startCheckout(priceId, planKey) {
    setErr("");
    setLoadingPlan(planKey);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to start checkout");
      }

      if (!data?.url) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = data.url;
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setLoadingPlan("");
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
            Vexta Pricing
          </h1>
          <p style={{ opacity: 0.8, marginTop: 8, marginBottom: 0 }}>
            Simple pricing. One powerful CRM. Cancel anytime.
          </p>
        </div>

        <Link
          href="/login"
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #111",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Log in
        </Link>
      </div>

      {err ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 12,
            marginBottom: 16,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 16,
        }}
      >
        <PlanCard
          plan={monthly}
          loading={loadingPlan === "monthly"}
          onChoose={() => startCheckout(monthly.priceId, "monthly")}
        />
        <PlanCard
          plan={yearly}
          loading={loadingPlan === "yearly"}
          onChoose={() => startCheckout(yearly.priceId, "yearly")}
        />
      </div>

      <div style={{ marginTop: 18, opacity: 0.85, lineHeight: 1.6 }}>
        <p style={{ marginBottom: 8 }}>
          <strong>Trial:</strong> Monthly includes a{" "}
          <strong>7-day free trial</strong>. You won’t be charged until the trial
          ends. Cancel anytime before day 7 to avoid being charged.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Yearly:</strong> No trial — the yearly plan already includes{" "}
          <strong>2 months free</strong> compared to monthly.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard" style={{ textDecoration: "underline" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function PlanCard({ plan, loading, onChoose }) {
  return (
    <div
      style={{
        border: plan.featured ? "2px solid #111" : "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
        boxShadow: plan.featured ? "0 12px 30px rgba(0,0,0,0.10)" : "none",
        position: "relative",
        overflow: "hidden",
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
          {plan.label}
        </h2>

        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #111",
            fontWeight: 900,
          }}
        >
          {plan.badge}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 34, fontWeight: 950 }}>{plan.price}</div>
          <div style={{ opacity: 0.7, fontWeight: 800 }}>{plan.sub}</div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #111",
            fontWeight: 950,
            letterSpacing: 0.2,
          }}
        >
          {plan.kicker}
        </div>
        <div style={{ opacity: 0.75, marginTop: 6, fontWeight: 700 }}>
          {plan.kickerNote}
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            background: "#fafafa",
            fontWeight: 900,
          }}
        >
          {plan.highlight}
        </div>
      </div>

      <ul style={{ marginTop: 14, paddingLeft: 18, lineHeight: 1.85 }}>
        {plan.bullets.map((b) => (
          <li key={b} style={{ fontWeight: 650 }}>
            {b}
          </li>
        ))}
      </ul>

      <button
        onClick={onChoose}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid #111",
          background: loading ? "#f3f4f6" : "#111",
          color: loading ? "#111" : "white",
          fontWeight: 950,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Redirecting…" : plan.cta}
      </button>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        By continuing, you agree to our billing terms. You can manage or cancel
        your subscription anytime from Settings.
      </div>
    </div>
  );
}
