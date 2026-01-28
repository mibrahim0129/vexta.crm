// app/auth/callback/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [msg, setMsg] = useState("Finalizing sign-in…");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const nextFromQuery = sp.get("next");
        const nextFromStorage =
          typeof window !== "undefined" ? localStorage.getItem("vexta_next") : null;

        const next =
          (nextFromQuery && nextFromQuery.startsWith("/") ? nextFromQuery : null) ||
          (nextFromStorage && nextFromStorage.startsWith("/") ? nextFromStorage : null) ||
          "/dashboard";

        if (typeof window !== "undefined") localStorage.removeItem("vexta_next");

        // If a session already exists, go
        const { data: existing } = await sb.auth.getSession();
        if (!alive) return;

        if (existing?.session) {
          router.replace(next);
          return;
        }

        // If there’s a code param, exchange it for a session
        const code = sp.get("code");
        if (code) {
          const { data, error } = await sb.auth.exchangeCodeForSession(code);
          if (!alive) return;

          if (error) throw error;
          if (!data?.session) throw new Error("No session returned from code exchange.");

          router.replace(next);
          return;
        }

        setMsg("Sign-in failed.");
        setDetail("Missing code/session. Please try logging in again.");
      } catch (e) {
        if (!alive) return;
        setMsg("Sign-in failed.");
        setDetail(e?.message || "Please try logging in again.");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [sb, router, sp]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
        Auth Callback
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>{msg}</p>

      {detail ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 12,
            fontWeight: 800,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <CallbackInner />
    </Suspense>
  );
}
