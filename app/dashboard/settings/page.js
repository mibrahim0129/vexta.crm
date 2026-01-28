// app/dashboard/settings/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser"; // your standardized client

export default function SettingsPage() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [subLoading, setSubLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const [billingLoading, setBillingLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [err, setErr] = useState("");

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

      // Fetch subscription (if table exists + RLS allows reading own row)
      setSubLoading(true);
      const { data: subRow, error: subErr } = await sb
        .from("subscriptions")
        .select("status, price_id, current_period_end, stripe_customer_id, stripe_subscription_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!alive) return;

      if (subErr) {
        // Don’t hard-fail settings page if RLS/table isn’t ready yet
        setSubscription(null);
      } else {
        setSubscription(subRow || null);
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
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to open billing portal");
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
  const hasAccess = status === "active" || status === "trialing";

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 950, margin: 0 }}>Settings</h1>
          <p style={{ opacity: 0.75, marginTop: 8, marginBottom: 0 }}>
            Manage your account and billing.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "9px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Back
          </Link>

          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{
              padding: "9px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "white",
              fontWeight: 900,
              cursor: logoutLoading ? "not-allowed" : "pointer",
            }}
          >
            {logoutLoading ? "Logging out…" : "Logout"}
          </button>
        </div>
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
            fontWeight: 800,
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="Account">
          {loading ? (
            <Muted>Loading…</Muted>
          ) : (
            <>
              <Row label="Email" value={user?.email || "—"} />
              <Row label="User ID" value={user?.id || "—"} mono />
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                If you have issues logging in, confirm you’re using the same email
                you subscribed with.
              </div>
            </>
          )}
        </Card>

        <Card title="Subscription">
          {subLoading ? (
            <Muted>Loading subscription…</Muted>
          ) : (
            <>
              <Row label="Status" value={status ? status.toUpperCase() : "NONE"} />
              <Row
                label="Access"
                value={hasAccess ? "ENABLED" : "NOT ACTIVE"}
                strong
              />
              <Row
                label="Renews / Ends"
                value={
                  subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleString()
                    : "—"
                }
              />
              <Row label="Plan" value={subscription?.price_id || "—"} mono />

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                  fontWeight: 850,
                }}
              >
                {status === "trialing"
                  ? "You’re currently in your trial. You won’t be charged until the trial ends."
                  : status === "active"
                  ? "Your subscription is active."
                  : "No active subscription found. Subscribe to get access."}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  style={{
                    padding: "11px 12px",
                    borderRadius: 14,
                    border: "1px solid #111",
                    background: "#111",
                    color: "white",
                    fontWeight: 950,
                    cursor: billingLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {billingLoading ? "Opening…" : "Manage Billing"}
                </button>

                <Link
                  href="/pricing"
                  style={{
                    padding: "11px 12px",
                    borderRadius: 14,
                    border: "1px solid #111",
                    background: "white",
                    textDecoration: "none",
                    fontWeight: 950,
                  }}
                >
                  View Pricing
                </Link>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Billing is managed securely through Stripe.
              </div>
            </>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
        <div>
          <strong>Note:</strong> If “Subscription” shows NONE but you just paid,
          it usually means the webhook hasn’t synced yet, or your webhook secret /
          endpoint isn’t configured.
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
        background: "white",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, strong }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div style={{ opacity: 0.7, fontWeight: 800 }}>{label}</div>
      <div
        style={{
          fontWeight: strong ? 950 : 850,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : "inherit",
          wordBreak: "break-all",
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Muted({ children }) {
  return <div style={{ opacity: 0.75, fontWeight: 700 }}>{children}</div>;
}
