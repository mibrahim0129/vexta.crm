// app/dashboard/settings/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const PRICE_MONTHLY = "price_1SuOMyA0KYJ0htSxcZPG0Vkg";
const PRICE_YEARLY = "price_1SuOMyA0KYJ0htSxF9os18YO";

function planName(priceId) {
  if (priceId === PRICE_MONTHLY) return "Monthly";
  if (priceId === PRICE_YEARLY) return "Yearly";
  return "Unknown";
}

function formatPeriodEnd(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [subLoading, setSubLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const [billingLoading, setBillingLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [err, setErr] = useState("");

  const billingReturned = sp?.get("billing") === "portal_return";

  useEffect(() => {
    let alive = true;

    async function load() {
      setErr("");
      setLoading(true);

      const { data, error } = await sb.auth.getUser();
      if (!alive) return;

      if (error || !data?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);

      setSubLoading(true);

      // IMPORTANT: don't use maybeSingle() (duplicates or multiple rows can exist)
      const { data: rows, error: subErr } = await sb
        .from("subscriptions")
        .select("status, price_id, current_period_end, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!alive) return;

      if (subErr) {
        setSubscription(null);
      } else {
        setSubscription(rows?.[0] || null);
      }

      setSubLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [sb, router]);

  async function handleManageBilling() {
    setErr("");
    setBillingLoading(true);

    try {
      const { data: sessionData, error: sessionErr } = await sb.auth.getSession();
      if (sessionErr) throw new Error(sessionErr.message);

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("You must be logged in.");

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to open billing portal");

      // If you kept old behavior somewhere else, still support it
      if (data?.needsCheckout) {
        router.push("/pricing");
        return;
      }

      if (!data?.url) throw new Error("Missing portal URL");
      window.location.href = data.url;
    } catch (e) {
      setErr(e?.message || "Something went wrong");
      setBillingLoading(false);
    }
  }

  async function handleLogout() {
    setErr("");
    setLogoutLoading(true);

    try {
      const { error } = await sb.auth.signOut();
      if (error) throw new Error(error.message);
      router.replace("/login");
    } catch (e) {
      setErr(e?.message || "Logout failed");
      setLogoutLoading(false);
    }
  }

  const status = subscription?.status || null;
  const hasAccess = status === "active" || status === "trialing" || status === "past_due";

  function statusLabel() {
    if (!status) return "NONE";
    return String(status).toUpperCase();
  }

  function accessLabel() {
    if (hasAccess) return "ENABLED";
    return "NOT ACTIVE";
  }

  const plan = planName(subscription?.price_id);
  const renews = formatPeriodEnd(subscription?.current_period_end);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 18 }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Settings</h1>
          <p style={styles.hint}>Account + billing</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/dashboard" style={styles.btnGhost}>
            Back
          </Link>

          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{ ...styles.btn, ...styles.btnDanger }}
          >
            {logoutLoading ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>

      {billingReturned ? (
        <div style={styles.notice}>
          Billing portal closed. If you changed anything, it may take a few seconds to update here.
        </div>
      ) : null}

      {err ? <div style={styles.error}>{err}</div> : null}

      <div style={styles.grid}>
        <Card title="Account">
          {loading ? (
            <Muted>Loading…</Muted>
          ) : (
            <>
              <Row label="Email" value={user?.email || "—"} />
              <Row label="User ID" value={user?.id || "—"} mono />
            </>
          )}
        </Card>

        <Card title="Subscription">
          {subLoading ? (
            <Muted>Loading…</Muted>
          ) : (
            <>
              <Row label="Status" value={statusLabel()} />
              <Row label="Access" value={accessLabel()} strong />
              <Row label="Plan" value={plan} />
              <Row label="Renews / Ends" value={renews} />

              <div style={styles.messageBox}>
                {!status
                  ? "No subscription found yet. Start your trial to activate billing."
                  : status === "trialing"
                  ? "You’re in a trial right now. Cancel anytime before the trial ends to avoid charges."
                  : status === "active"
                  ? "Your subscription is active."
                  : status === "past_due"
                  ? "Your payment is past due. You may still have access temporarily—please update your payment method."
                  : "Your subscription is not active. Manage billing or resubscribe."}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  style={styles.btnPrimary}
                >
                  {billingLoading ? "Opening…" : "Manage Billing"}
                </button>

                <Link href="/pricing" style={styles.btnGhost}>
                  View Pricing
                </Link>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Billing opens Stripe’s secure portal (update card, cancel, invoices).
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, strong }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div
        style={{
          ...styles.rowValue,
          fontWeight: strong ? 950 : 850,
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Muted({ children }) {
  return <div style={{ opacity: 0.75, fontWeight: 750 }}>{children}</div>;
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  h1: { fontSize: 28, fontWeight: 950, margin: 0 },
  hint: { opacity: 0.7, marginTop: 8, marginBottom: 0, fontWeight: 750 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 14,
    marginTop: 14,
  },

  card: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.06)",
    color: "white",
  },
  cardTitle: { fontSize: 14, fontWeight: 950, marginBottom: 12, opacity: 0.95 },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },
  rowLabel: { opacity: 0.7, fontWeight: 800 },
  rowValue: { fontWeight: 850, wordBreak: "break-all", textAlign: "right" },

  btnPrimary: {
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
  },
  btn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
  },
  btnDanger: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
  },

  messageBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    fontWeight: 850,
    lineHeight: 1.45,
  },

  notice: {
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.10)",
    color: "#bbf7d0",
    padding: 12,
    borderRadius: 14,
    fontWeight: 850,
    marginTop: 10,
  },
  error: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    padding: 12,
    borderRadius: 14,
    fontWeight: 850,
    marginTop: 10,
  },
};
