// app/signup/page.js
"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Footer from "@/app/components/Footer";

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
  const sb = useMemo(() => supabaseBrowser(), []);

  const redirectTo = useMemo(() => {
    const r = sp.get("redirectTo") || sp.get("next");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await sb.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "Sign up failed.");
        return;
      }

      // If session exists immediately, go dashboard.
      if (data?.session) {
        router.refresh();
        router.push(redirectTo);
        return;
      }

      // Otherwise email confirmation might be required.
      setOk("Account created. Check your email to confirm, then log in.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setOk("");
    setOauthLoading(true);

    try {
      // Store where to go AFTER signup/login
      localStorage.setItem("vexta_next", redirectTo);

      const origin = window.location.origin;
      const cb = `${origin}/auth/callback`; // ✅ NO query params

      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: cb,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        setError(error.message || "Google sign-in failed.");
        setOauthLoading(false);
      }
    } catch (e) {
      setError(e?.message || "Google sign-in failed. Please try again.");
      setOauthLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="bg" />

      <div className="wrap">
        <div className="card">
          <Link href="/" className="brand">
            <span className="logo" />
            <span className="brandName">Vexta</span>
          </Link>

          <h1 className="h1">Create your account</h1>
          <p className="p">Start managing your pipeline in one place.</p>

          {error ? <div className="error">{error}</div> : null}
          {ok ? <div className="ok">{ok}</div> : null}

          <button
            type="button"
            className="btn btnPrimary btnFull"
            onClick={signUpWithGoogle}
            disabled={loading || oauthLoading}
          >
            <GoogleIcon />
            {oauthLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="orRow">
            <div className="line" />
            <div className="or">or</div>
            <div className="line" />
          </div>

          <form onSubmit={onSubmit} className="form">
            <label className="label">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </label>

            <label className="label">
              Password
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
              />
            </label>

            <button
              type="submit"
              className="btn btnGhost btnFull"
              disabled={loading || oauthLoading}
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="bottomLinks">
            <Link href="/login">Already have an account?</Link>
            <Link href="/">Back to home</Link>
          </div>

          <div className="legalLinks">
            <Link href="/terms">Terms</Link>
            <span className="dot">•</span>
            <Link href="/privacy">Privacy</Link>
            <span className="dot">•</span>
            <Link href="/refunds">Refunds</Link>
          </div>
        </div>

        <div className="footerWrap">
          <Footer variant="dark" />
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #fff;
          background: #0a0a0a;
          display: grid;
          place-items: center;
          padding: 24px 18px;
        }
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: radial-gradient(1000px circle at 20% 10%, rgba(255, 255, 255, 0.12), transparent 60%),
            radial-gradient(900px circle at 80% 35%, rgba(255, 255, 255, 0.1), transparent 55%),
            linear-gradient(to bottom, #0a0a0a, #000);
        }
        .wrap {
          width: 100%;
          max-width: 560px;
          display: grid;
          gap: 14px;
        }
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 30px 120px rgba(0, 0, 0, 0.55);
          padding: 18px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #fff;
        }
        .logo {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: #fff;
        }
        .brandName {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.4px;
        }
        .h1 {
          margin: 14px 0 0;
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -0.6px;
        }
        .p {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 13px;
        }
        .error {
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.1);
          color: #fecaca;
          padding: 12px;
          font-weight: 850;
          font-size: 13px;
          line-height: 1.35;
        }
        .ok {
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(34, 197, 94, 0.25);
          background: rgba(34, 197, 94, 0.08);
          color: rgba(220, 252, 231, 0.95);
          padding: 12px;
          font-weight: 850;
          font-size: 13px;
          line-height: 1.35;
        }
        .orRow {
          margin: 14px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .line {
          height: 1px;
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        .or {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 800;
        }
        .form {
          display: grid;
          gap: 12px;
          margin-top: 6px;
        }
        .label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.8);
        }
        .input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          padding: 10px 12px;
          color: #fff;
          outline: none;
          font-size: 14px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.05s ease, background 0.15s ease;
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
        .btn:active {
          transform: translateY(1px);
        }
        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .btnFull {
          width: 100%;
        }
        .btnPrimary {
          background: #fff;
          color: #0a0a0a;
        }
        .btnGhost:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .bottomLinks {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }
        .bottomLinks :global(a) {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 850;
        }
        .legalLinks {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          opacity: 0.9;
        }
        .legalLinks :global(a) {
          color: rgba(255, 255, 255, 0.65);
          text-decoration: none;
          font-weight: 850;
        }
        .dot {
          opacity: 0.35;
          font-weight: 900;
        }
        .footerWrap {
          padding: 0 2px 8px;
        }
      `}</style>
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
