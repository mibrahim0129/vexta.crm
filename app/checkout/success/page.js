// app/checkout/success/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function SuccessInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [msg, setMsg] = useState("Activating your account…");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const sessionId = sp.get("session_id");
        if (!sessionId) {
          setMsg("Missing session id.");
          setDetail("Please go back to Pricing and try again.");
          return;
        }

        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess?.session?.access_token;

        if (!accessToken) {
          router.replace(
            `/login?next=${encodeURIComponent(
              `/checkout/success?session_id=${sessionId}`
            )}`
          );
          return;
        }

        const res = await fetch("/api/stripe/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const json = await res.json().catch(() => ({}));
        if (!alive) return;

        if (!res.ok) {
          setMsg("Activation failed.");
          setDetail(json?.error || "Please try again.");
          return;
        }

        router.replace("/dashboard");
      } catch (e) {
        if (!alive) return;
        setMsg("Activation failed.");
        setDetail(e?.message || "Please try again.");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router, sb, sp]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 10 }}>
        You’re in ✅
      </h1>
      <p style={{ opacity: 0.85, marginBottom: 12 }}>{msg}</p>
      {detail ? (
        <div
          style={{
            borderRadius: 12,
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
            fontWeight: 850,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0b0b0b",
            color: "white",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ fontWeight: 950, opacity: 0.9 }}>Loading…</div>
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
