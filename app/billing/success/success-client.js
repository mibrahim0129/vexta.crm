"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const POLL_MS = 1500;
const MAX_MS = 45000;

// statuses that should grant access
const OK = new Set(["active", "trialing"]);

function pillStyle(kind) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.95,
    userSelect: "none",
  };

  if (kind === "success") return { ...base, border: "1px solid rgba(120,255,160,0.25)" };
  if (kind === "warn") return { ...base, border: "1px solid rgba(255,210,120,0.25)" };
  if (kind === "error") return { ...base, border: "1px solid rgba(255,120,120,0.25)" };
  return base;
}

export default function SuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const sessionId = sp.get("session_id") || "";

  const [stage, setStage] = useState("starting"); // starting | polling | done | timeout | error
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let alive = true;
    let redirectTimer = null;

    async function redirectToLogin() {
      const next = `/billing/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }

    async function run() {
      try {
        setStage("starting");
        setMsg("");

        // If Stripe didn't include session_id, don't blow up—just route to pricing.
        if (!sessionId) {
          setStage("error");
          setMsg("Missing session id from Stripe. Redirecting you to pricing…");
          redirectTimer = setTimeout(() => router.replace("/pricing"), 1200);
          return;
        }

        // Ensure logged in
        const { data } = await sb.auth.getSession();
        const session = data?.session;

        if (!session) {
          await redirectToLogin();
          return;
        }

        if (!alive) return;

        setEmail(session.user?.email || "");
        setStage("polling");
        setMsg("Activating your subscription…");

        const start = Date.now();

        while (alive && Date.now() - start < MAX_MS) {
          const { data: row, error } = await sb
            .from("subscriptions")
            .select("status, access, plan, current_period_end, stripe_customer_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!alive) return;

          if (!error && row) {
            setDetails(row);

            const statusOk = row.status && OK.has(String(row.status).toLowerCase());
            const accessOk = row.access === true;

            if (statusOk || accessOk) {
              setStage("done");
              setMsg("You’re all set. Redirecting to your dashboard…");
              redirectTimer = setTimeout(() => {
                router.replace("/dashboard?welcome=1");
                router.refresh();
              }, 600);
              return;
            }
          }

          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, POLL_MS));
        }

        if (!alive) return;
        setStage("timeout");
        setMsg(
          "Your payment went through, but activation is taking longer than expected. This is usually a webhook delay."
        );
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setStage("error");
        setMsg(e?.message || "Something went wrong while activating your subscription.");
      }
    }

    run();

    return () => {
      alive = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function openPortal() {
    try {
      const { data } = await sb.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        const next = `/billing/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnTo: `/billing/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
        }),
      });

      const json = await res.json();
      if (json?.url) window.location.href = json.url;
      else alert(json?.error || "Could not open billing portal.");
    } catch (e) {
      alert(e?.message || "Could not open billing portal.");
    }
  }

  const headline =
    stage === "done"
      ? "Payment successful"
      : stage === "timeout"
      ? "Almost there…"
      : stage === "error"
      ? "Something went wrong"
      : "Finalizing your subscription";

  const pill =
    stage === "done"
      ? { text: "Activated", kind: "success" }
      : stage === "timeout"
      ? { text: "Delayed", kind: "warn" }
      : stage === "error"
      ? { text: "Needs attention", kind: "error" }
      : { text: "Working…", kind: "neutral" };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          style={{
            width: "100%",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: -0.2 }}>{headline}</div>
            <span style={pillStyle(pill.kind)}>{pill.text}</span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800, lineHeight: 1.45 }}>
            {msg || "One moment…"}
          </div>

          {email ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Signed in as {email}</div>
          ) : null}

          {details ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.20)",
                fontSize: 12,
                opacity: 0.92,
              }}
            >
              <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Subscription status</div>
              <div style={{ display: "grid", gap: 4 }}>
                <div>
                  <span style={{ opacity: 0.7 }}>status:</span>{" "}
                  <span style={{ fontWeight: 900 }}>{details.status || "—"}</span>
                </div>
                <div>
                  <span style={{ opacity: 0.7 }}>plan:</span>{" "}
                  <span style={{ fontWeight: 900 }}>{details.plan || "—"}</span>
                </div>
                <div>
                  <span style={{ opacity: 0.7 }}>access:</span>{" "}
                  <span style={{ fontWeight: 900 }}>{details.access ? "true" : "false"}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </Link>

            <button
              onClick={openPortal}
              type="button"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Open billing portal
            </button>

            <Link
              href="/pricing"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
                fontWeight: 900,
                textDecoration: "none",
                opacity: 0.9,
              }}
            >
              Back to pricing
            </Link>
          </div>

          {stage === "timeout" ? (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, fontWeight: 800, lineHeight: 1.45 }}>
              Still not active? That usually means Stripe webhooks aren’t reaching your app, or the subscription row
              isn’t being written/updated. Check Stripe webhook deliveries and your Supabase `subscriptions` table.
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6, fontWeight: 800 }}>
          Tip: If you’re demoing and want to skip waiting, open your Dashboard in a new tab—your webhook may land a few
          seconds later.
        </div>
      </div>
    </main>
  );
}
