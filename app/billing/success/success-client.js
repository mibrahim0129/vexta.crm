// app/billing/success/success-client.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const sessionId = sp?.get("session_id") || "";

  const sb = useMemo(() => supabaseBrowser(), []);

  const [msg, setMsg] = useState("Finalizing your subscription…");
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState({
    hasSessionId: false,
    syncAttempted: false,
    syncOk: null,
    syncStatus: null,
    syncError: "",
    lastDbStatus: "",
  });

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        setDebug((d) => ({ ...d, hasSessionId: !!sessionId }));

        const { data } = await sb.auth.getSession();
        const userId = data?.session?.user?.id;
        const token = data?.session?.access_token;

        if (!userId || !token) {
          router.replace(`/login?next=${encodeURIComponent("/billing/success")}`);
          return;
        }

        // 1) Force a server-side sync from Stripe using session_id
        if (sessionId) {
          setMsg("Syncing payment with Stripe…");
          setDebug((d) => ({ ...d, syncAttempted: true, syncError: "" }));

          try {
            const res = await fetch("/api/stripe/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ session_id: sessionId }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
              setDebug((d) => ({
                ...d,
                syncOk: false,
                syncStatus: res.status,
                syncError: json?.error || "Sync failed",
              }));
            } else {
              setDebug((d) => ({
                ...d,
                syncOk: true,
                syncStatus: res.status,
                syncError: "",
              }));
            }
          } catch (e) {
            setDebug((d) => ({
              ...d,
              syncOk: false,
              syncStatus: 0,
              syncError: e?.message || "Network error calling /api/stripe/sync",
            }));
          }
        } else {
          setDebug((d) => ({
            ...d,
            syncAttempted: false,
            syncOk: false,
            syncStatus: 0,
            syncError: "Missing session_id in URL. Checkout success_url is not passing it.",
          }));
        }

        // 2) Poll DB for up to ~30 seconds
        setMsg("Finalizing your subscription…");
        const okStatuses = new Set(["active", "trialing", "past_due"]);
        const started = Date.now();

        while (alive && Date.now() - started < 30000) {
          const { data: rows, error: dbErr } = await sb
            .from("subscriptions")
            .select("status, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!alive) return;

          if (dbErr) {
            setDebug((d) => ({
              ...d,
              lastDbStatus: `DB error: ${dbErr.message || "unknown"}`,
            }));
          } else {
            const status = rows?.[0]?.status || "";
            setDebug((d) => ({ ...d, lastDbStatus: status || "(none)" }));

            if (okStatuses.has(status)) {
              setMsg("All set. Redirecting to your dashboard…");
              router.replace("/dashboard");
              return;
            }
          }

          await new Promise((r) => setTimeout(r, 900));
        }

        setMsg("Payment received. We’re still syncing your account.");
        setErr(
          "Sync didn’t complete. See the debug box below — it will tell us exactly why."
        );
      } catch (e) {
        if (!alive) return;
        setMsg("Payment received. We’re still syncing your account.");
        setErr(e?.message || "Sync error");
      }
    }

    poll();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 20 }}>Payment successful 🎉</div>
        <div style={{ marginTop: 8, opacity: 0.85, fontWeight: 750 }}>{msg}</div>

        {err ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.10)",
              color: "#fecaca",
              padding: 12,
              borderRadius: 14,
              fontWeight: 800,
              lineHeight: 1.45,
            }}
          >
            {err}
          </div>
        ) : null}

        {/* Debug (temporary) */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.35)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            opacity: 0.95,
          }}
        >
          <div>session_id: {sessionId ? sessionId : "(missing)"}</div>
          <div>syncAttempted: {String(debug.syncAttempted)}</div>
          <div>syncOk: {String(debug.syncOk)}</div>
          <div>syncStatus: {String(debug.syncStatus)}</div>
          <div>syncError: {debug.syncError || "(none)"}</div>
          <div>lastDbStatus: {debug.lastDbStatus || "(none)"}</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.reload()}
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
            Refresh
          </button>

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

          <Link
            href="/pricing"
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
            Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
