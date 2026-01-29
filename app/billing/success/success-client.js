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

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const { data } = await sb.auth.getSession();
        const userId = data?.session?.user?.id;

        if (!userId) {
          router.replace(`/login?next=${encodeURIComponent("/billing/success")}`);
          return;
        }

        const okStatuses = new Set(["active", "trialing", "past_due"]);
        const started = Date.now();

        while (alive && Date.now() - started < 10000) {
          const { data: rows } = await sb
            .from("subscriptions")
            .select("status, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!alive) return;

          const status = rows?.[0]?.status || "";
          if (okStatuses.has(status)) {
            setMsg("All set. Redirecting to your dashboard…");
            router.replace("/dashboard");
            return;
          }

          await new Promise((r) => setTimeout(r, 800));
        }

        setMsg("Payment received. We’re still syncing your account.");
        setErr("Try refreshing in a minute. If it keeps happening, go back to Pricing.");
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
  }, []);

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
          maxWidth: 560,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 20 }}>Payment successful 🎉</div>
        <div style={{ marginTop: 8, opacity: 0.85, fontWeight: 750 }}>{msg}</div>

        {sessionId ? (
          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
          </div>
        ) : null}

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
