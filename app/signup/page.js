// app/signup/page.js
"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.4 35.8 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C40.6 35.8 44 30.5 44 24c0-1.1-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function SignupInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = sp.get("redirectTo") || sp.get("next");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Signup failed.");
        setLoading(false);
        return;
      }

      // If email confirmations are ON, there may be no session yet.
      if (!data?.session) {
        setNotice("Account created. Check your email to confirm, then come back and log in.");
        setLoading(false);
        return;
      }

      router.refresh();
      router.push(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setNotice("");
    setOauthLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setError(error.message || "Google sign-in failed.");
        setOauthLoading(false);
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
      setOauthLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} />

      <div style={styles.card}>
        <Link href="/" style={styles.brand}>
          <span style={styles.logo} />
          <span style={styles.brandName}>Vexta</span>
        </Link>

        <h1 style={styles.h1}>Create your account</h1>
        <p style={styles.p}>Start managing your pipeline in one place.</p>

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <button
          type="button"
          onClick={signUpWithGoogle}
          disabled={loading || oauthLoading}
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading || oauthLoading ? 0.7 : 1 }}
        >
          <GoogleIcon /> {oauthLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <div style={styles.orRow}>
          <div style={styles.line} />
          <div style={styles.or}>or</div>
          <div style={styles.line} />
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading || oauthLoading}
            style={{ ...styles.btn, ...styles.btnGhost, opacity: loading || oauthLoading ? 0.7 : 1 }}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div style={styles.links}>
          <Link href="/login" style={styles.link}>
            Already have an account?
          </Link>
          <Link href="/" style={styles.link}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <SignupInner />
    </Suspense>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#fff" },
  bg: {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    background:
      "radial-gradient(1000px circle at 20% 10%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(900px circle at 80% 35%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(to bottom, #0a0a0a, #000)",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
  },
  brand: { display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" },
  logo: { width: 36, height: 36, borderRadius: 12, background: "#fff" },
  brandName: { fontSize: 18, fontWeight: 900, letterSpacing: -0.4 },
  h1: { margin: "14px 0 0", fontSize: 26, fontWeight: 950, letterSpacing: -0.6 },
  p: { marginTop: 8, fontSize: 13, opacity: 0.7, lineHeight: 1.4 },
  error: {
    marginTop: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    padding: 12,
    fontWeight: 850,
    fontSize: 13,
  },
  notice: {
    marginTop: 12,
    borderRadius: 14,
    border: "1px solid rgba(16,185,129,0.35)",
    background: "rgba(16,185,129,0.12)",
    color: "#d1fae5",
    padding: 12,
    fontWeight: 850,
    fontSize: 13,
    lineHeight: 1.4,
  },
  btn: {
    width: "100%",
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnPrimary: { background: "#fff", color: "#0a0a0a" },
  btnGhost: { background: "rgba(255,255,255,0.06)", color: "#fff" },
  orRow: { margin: "14px 0", display: "flex", alignItems: "center", gap: 10 },
  line: { height: 1, flex: 1, background: "rgba(255,255,255,0.10)" },
  or: { fontSize: 12, opacity: 0.6, fontWeight: 800 },
  form: { display: "grid", gap: 12, marginTop: 6 },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.80)" },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.28)",
    padding: "10px 12px",
    color: "#fff",
    outline: "none",
    fontSize: 14,
  },
  links: { marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12 },
  link: { color: "rgba(255,255,255,0.70)", textDecoration: "none", fontWeight: 850, fontSize: 13 },
};
