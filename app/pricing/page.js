// app/pricing/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Footer from "@/app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

const PRICE_MONTHLY = "price_1SuOMyA0KYJ0htSxcZPG0Vkg"; // 7-day trial
const PRICE_YEARLY = "price_1SuOMyA0KYJ0htSxF9os18YO"; // no trial

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [err, setErr] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!alive) return;
      setHasSession(!!data?.session);
    })();
    return () => {
      alive = false;
    };
  }, [sb]);

  const monthly = useMemo(
    () => ({
      key: "monthly",
      label: "Monthly",
      price: "$29",
      sub: "/month",
      kicker: "7-day free trial",
      kickerNote: "Card required • Cancel anytime during trial",
      highlight: "Try Vexta free for 7 days",
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
      intent: "start",
    }),
    []
  );

  const yearly = useMemo(
    () => ({
      key: "yearly",
      label: "Yearly",
      price: "$290",
      sub: "/year",
      kicker: "2 months free",
      kickerNote: "Save vs monthly • Billed yearly",
      highlight: "Best value for serious agents",
      bullets: ["Everything in Monthly", "Best value for serious agents", "Priority support", "One invoice for the year"],
      priceId: PRICE_YEARLY,
      cta: "Go yearly (save 2 months)",
      badge: "Best value",
      featured: false,
      intent: "value",
    }),
    []
  );

  async function startCheckout(priceId, planKey) {
    setErr("");
    setLoadingPlan(planKey);

    try {
      const { data: sessionData, error: sessionErr } = await sb.auth.getSession();
      if (sessionErr) throw new Error(sessionErr.message);

      const token = sessionData?.session?.access_token;
      if (!token) {
        router.push(`/login?next=${encodeURIComponent("/pricing")}`);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");
      if (!data?.url) throw new Error("Missing checkout URL");

      window.location.href = data.url;
    } catch (e) {
      setErr(e?.message || "Something went wrong");
      setLoadingPlan("");
    }
  }

  return (
    <main className="page">
      <div className="bg" />

      {/* ✅ Shared header */}
      <PublicHeader variant="dark" active="pricing" right="signup" />

      <section className="wrap top">
        <div className="titleRow">
          <div>
            <div className="pill">
              <span className="pillDot" aria-hidden="true" />
              Simple plans • Cancel anytime
            </div>
            <h1 className="h1">Pricing</h1>
            <p className="subhead">Start with the monthly trial, or go yearly for the best value.</p>
          </div>

          <div className="titleActions">
            {hasSession ? (
              <Link href="/dashboard" className="btn btnGhost">
                Back to dashboard
              </Link>
            ) : null}
          </div>
        </div>

        {err ? <div className="errorBox">{err}</div> : null}

        <div className="grid">
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

        <div className="fine">
          <p>
            <strong>Monthly:</strong> includes a <strong>7-day free trial</strong>. Cancel before day 7 to avoid charges.
          </p>
          <p>
            <strong>Yearly:</strong> no trial — you already get <strong>2 months free</strong> vs monthly.
          </p>
        </div>

        <div className="footerWrap">
          <Footer variant="dark" />
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #fff;
          background: #070707;
        }
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: radial-gradient(1200px circle at 18% 10%, rgba(255, 255, 255, 0.14), transparent 62%),
            radial-gradient(900px circle at 82% 24%, rgba(138, 180, 255, 0.1), transparent 55%),
            radial-gradient(800px circle at 50% 90%, rgba(255, 255, 255, 0.06), transparent 60%),
            linear-gradient(to bottom, #070707, #000);
        }
        .wrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .top {
          padding: 40px 0 34px;
        }
        .titleRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 255, 255, 0.86);
        }
        .pillDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(138, 180, 255, 0.95);
          box-shadow: 0 0 0 4px rgba(138, 180, 255, 0.12);
        }
        .h1 {
          margin: 12px 0 0;
          font-size: 44px;
          line-height: 1.05;
          letter-spacing: -1.1px;
          font-weight: 980;
        }
        .subhead {
          margin: 10px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.74);
          max-width: 620px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease;
          user-select: none;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .btn:active {
          transform: translateY(1px);
        }
        .btnGhost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .btnGhost:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .errorBox {
          margin: 12px 0 16px;
          border: 1px solid rgba(255, 99, 99, 0.35);
          background: rgba(255, 99, 99, 0.1);
          color: rgba(255, 210, 210, 0.95);
          padding: 12px 14px;
          border-radius: 16px;
          font-weight: 850;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-top: 18px;
        }

        .fine {
          margin-top: 16px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.65;
          font-size: 13px;
        }
        .fine p {
          margin: 8px 0 0;
        }

        .footerWrap {
          margin-top: 26px;
        }

        @media (min-width: 900px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  );
}

function PlanCard({ plan, loading, onChoose }) {
  const isFeatured = !!plan.featured;

  return (
    <div className={`card ${isFeatured ? "cardFeatured" : ""}`}>
      <div className="cardTop">
        <div>
          <div className="planRow">
            <div className="planName">{plan.label}</div>
            <div className={`badge ${plan.intent === "value" ? "badgeValue" : ""}`}>{plan.badge}</div>
          </div>

          <div className="priceRow">
            <div className="price">{plan.price}</div>
            <div className="sub">{plan.sub}</div>
          </div>

          <div className="kickerPill">
            <span className="kickerIcon" aria-hidden="true">
              <SparkIcon />
            </span>
            {plan.kicker}
          </div>
          <div className="kickerNote">{plan.kickerNote}</div>
        </div>
      </div>

      <div className="highlight">{plan.highlight}</div>

      <ul className="list">
        {plan.bullets.map((b) => (
          <li key={b} className="li">
            <span className="liIcon" aria-hidden="true">
              <CheckIcon />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button className={`ctaBtn ${isFeatured ? "ctaBtnPrimary" : "ctaBtnGhost"}`} onClick={onChoose} disabled={loading}>
        {loading ? "Redirecting…" : plan.cta}
      </button>

      <style jsx>{`
        .card {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          padding: 16px;
          box-shadow: 0 28px 120px rgba(0, 0, 0, 0.45);
        }
        .cardFeatured {
          border-color: rgba(138, 180, 255, 0.28);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 38px 160px rgba(0, 0, 0, 0.55);
          position: relative;
          overflow: hidden;
        }
        .cardFeatured::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, rgba(138, 180, 255, 0.18), transparent 65%);
        }

        .cardTop {
          position: relative;
        }

        .planRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .planName {
          font-size: 18px;
          font-weight: 980;
          letter-spacing: -0.3px;
        }
        .badge {
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.22);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .badgeValue {
          border-color: rgba(138, 180, 255, 0.26);
          background: rgba(138, 180, 255, 0.1);
          color: rgba(255, 255, 255, 0.92);
        }

        .priceRow {
          margin-top: 10px;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .price {
          font-size: 40px;
          font-weight: 990;
          letter-spacing: -1px;
        }
        .sub {
          font-weight: 850;
          color: rgba(255, 255, 255, 0.62);
        }

        .kickerPill {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          font-weight: 900;
        }
        .kickerIcon {
          color: rgba(138, 180, 255, 0.95);
          display: inline-flex;
        }
        .kickerNote {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
        }

        .highlight {
          margin-top: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.24);
          padding: 12px;
          font-weight: 950;
          letter-spacing: -0.2px;
          color: rgba(255, 255, 255, 0.86);
          position: relative;
        }

        .list {
          margin: 14px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: rgba(255, 255, 255, 0.78);
          font-weight: 750;
          line-height: 1.5;
          font-size: 14px;
        }
        .liIcon {
          display: inline-flex;
          width: 22px;
          height: 22px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .ctaBtn {
          width: 100%;
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 950;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.14);
          transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .ctaBtn:active {
          transform: translateY(1px);
        }
        .ctaBtn:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .ctaBtnPrimary {
          background: #fff;
          color: #0a0a0a;
        }
        .ctaBtnPrimary:hover:enabled {
          background: rgba(255, 255, 255, 0.92);
        }

        .ctaBtnGhost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .ctaBtnGhost:hover:enabled {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
