"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Login</h1>
        <p style={styles.p}>Loading…</p>
      </div>
    </main>
  );
}

function LoginInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loginWithGoogle() {
    setErr("");
    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;

      // Supabase will redirect away; no need to router.push here.
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Google login failed");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Login</h1>
        <p style={styles.p}>Sign in to access your dashboard.</p>

        {err ? <div style={styles.error}>{err}</div> : null}

        <button onClick={loginWithGoogle} style={styles.btn} disabled={loading}>
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div style={styles.small}>
          After login, you’ll be redirected to: <b>{next}</b>
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
    background: "radial-gradient(circle at top, rgba(255,255,255,0.08), rgba(0,0,0,1))",
    color: "white",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.55)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },
  h1: { margin: 0, fontSize: 36, letterSpacing: -0.6 },
  p: { marginTop: 8, opacity: 0.75, lineHeight: 1.4 },
  error: {
    marginTop: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    borderRadius: 12,
    padding: 12,
    fontWeight: 800,
  },
  btn: {
    marginTop: 14,
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "white",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },
  small: { marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.4 },
};
