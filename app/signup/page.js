"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SignupInner />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Create account</h1>
        <p style={styles.p}>Loading…</p>
      </div>
    </main>
  );
}

function SignupInner() {
  const router = useRouter();
  const sb = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) throw error;

      if (!data?.session) {
        setNotice(
          "Account created. Please check your email to confirm your account."
        );
        setLoading(false);
        return;
      }

      router.refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed.");
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setOauthLoading(true);

    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
    } catch {
      setError("Google signup failed.");
      setOauthLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Link href="/" style={styles.logo}>
          Vexta
        </Link>

        <h1 style={styles.h1}>Create account</h1>
        <p style={styles.p}>
          Get started organizing your contacts, deals, and follow-ups.
        </p>

        {error && <div style={styles.error}>{error}</div>}
        {notice && <div style={styles.notice}>{notice}</div>}

        <button
          onClick={signUpWithGoogle}
          disabled={oauthLoading || loading}
          style={{
            ...styles.googleBtn,
            opacity: oauthLoading || loading ? 0.6 : 1,
          }}
        >
          Continue with Google
        </button>

        <div style={styles.divider}>
          <span>or</span>
        </div>

        <form onSubmit={handleSignup} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading || oauthLoading}
            style={{
              ...styles.primaryBtn,
              opacity: loading || oauthLoading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={styles.footer}>
          <Link href="/login" style={styles.link}>
            Already have an account?
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ===================== STYLES ===================== */

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
    maxWidth: 420,
    padding: 24,
    borderRadius: 18,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    backdropFilter: "blur(12px)",
  },

  logo: {
    fontSize: 22,
    fontWeight: 900,
    textDecoration: "none",
    color: "white",
    display: "inline-block",
    marginBottom: 10,
  },

  h1: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: -0.6,
  },

  p: {
    marginTop: 8,
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 1.4,
  },

  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    color: "#fecaca",
    fontWeight: 700,
  },

  notice: {
    background: "rgba(16,185,129,0.15)",
    border: "1px solid rgba(16,185,129,0.35)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    color: "#d1fae5",
    fontWeight: 700,
  },

  googleBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 12,
  },

  divider: {
    textAlign: "center",
    opacity: 0.5,
    margin: "12px 0",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.4)",
    color: "white",
    outline: "none",
  },

  primaryBtn: {
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.8,
  },

  link: {
    color: "white",
    fontWeight: 700,
    textDecoration: "underline",
  },
};
