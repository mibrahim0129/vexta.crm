// app/auth/callback/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <Inner />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Auth Callback</h1>
        <p style={styles.p}>Finishing sign-in…</p>
      </div>
    </main>
  );
}

function Inner() {
  const sb = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp.get("next") || "/dashboard";
  const code = sp.get("code");
  const error = sp.get("error");
  const errorDesc = sp.get("error_description");

  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (error) {
          setErr(`${error}${errorDesc ? `: ${errorDesc}` : ""}`);
          setMsg("Sign-in failed.");
          return;
        }

        // If Supabase already detected session from URL, we’re good.
        const pre = await sb.auth.getSession();
        if (pre?.data?.session) {
          setMsg("Signed in! Redirecting…");
          router.replace(next);
          router.refresh();
          return;
        }

        if (!code) {
          setErr("Missing code. Please try logging in again.");
          setMsg("Sign-in failed.");
          return;
        }

        const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
        if (exErr) throw exErr;

        const { data } = await sb.auth.getSession();
        if (!data?.session) {
          setErr("No session found after login. Please try again.");
          setMsg("Sign-in incomplete.");
          return;
        }

        setMsg("Signed in! Redirecting…");
        router.replace(next);
        router.refresh();
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Callback failed");
        setMsg("Sign-in failed.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Auth Callback</h1>
        <p style={styles.p}>{msg}</p>

        {err ? <div style={styles.error}>{err}</div> : null}

        <div style={styles.small}>
          If you get stuck here, go to{" "}
          <a href="/login" style={styles.link}>
            /login
          </a>{" "}
          and try again.
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.08), rgba(0,0,0,1))",
    color: "white",
  },
  card: {
    width: "100%",
    maxWidth: 780,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.55)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },
  h1: { margin: 0, fontSize: 34, letterSpacing: -0.6, fontWeight: 950 },
  p: { marginTop: 10, opacity: 0.8, lineHeight: 1.4 },
  error: {
    marginTop: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    borderRadius: 12,
    padding: 12,
    fontWeight: 900,
    lineHeight: 1.4,
  },
  small: { marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.4 },
  link: { color: "white", fontWeight: 900, textDecoration: "underline" },
};
