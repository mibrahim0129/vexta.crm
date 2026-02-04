// app/login/page.js
"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Footer from "@/app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginInner() {
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

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed.");
        return;
      }

      router.replace(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setOauthLoading(true);

    try {
      localStorage.setItem("vexta_next", redirectTo);

      const origin = window.location.origin;
      const cb = `${origin}/auth/callback`;

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

      {/* ✅ Shared header */}
      <PublicHeader variant="dark" active="" right="signup" />

      <section className="wrap layout">
        {/* Left (desktop) */}
        <div className="left">
          <div className="pill">
            <span className="pillDot" aria-hidden="true" />
            Back to work — fast and clean
          </div>

          <h1 className="h1">
            Welcome back to <span className="muted">Vexta</span>.
          </h1>

          <p className="p">
            Log in to manage contacts, deals, tasks, notes, and calendar events — all linked so your next action is
            always obvious.
          </p>

          <div className="leftStack">
            {[
              "Contact profiles as the hub (deals/notes/tasks/events)",
              "Deal pages with task buckets + event visibility",
              "Filters designed for daily execution",
            ].map((t) => (
              <div key={t} className="leftItem">
                <span className="leftCheck" aria-hidden="true">
                  <CheckIcon />
                </span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div className="leftLinks">
            <Link href="/" className="textLink">
              ← Back to home
            </Link>
            <Link href="/pricing" className="textLink">
              View pricing
            </Link>
          </div>
        </div>

        {/* Right */}
        <div className="right">
          <div className="card">
            <div className="cardTop">
              <div className="cardTitle">Log in</div>
              <div className="cardSub">Access your dashboard.</div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <button
              type="button"
              className="btn btnPrimary btnFull btnLg"
              onClick={signInWithGoogle}
              disabled={loading || oauthLoading}
            >
              <GoogleIcon />
              {oauthLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="orRow" aria-hidden="true">
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              <button type="submit" className="btn btnGhost btnFull btnLg" disabled={loading || oauthLoading}>
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <div className="bottomLinks">
              <Link href="/signup">Create an account</Link>
              <Link href="/pricing">Pricing</Link>
            </div>

            <div className="legalLinks">
              <Link href="/terms">Terms</Link>
              <span className="dot">•</span>
              <Link href="/privacy">Privacy</Link>
              <span className="dot">•</span>
              <Link href="/refunds">Refunds</Link>
            </div>
          </div>

          <div className="fine">
            By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </div>
        </div>
      </section>

      <div className="footerWrap">
        <Footer variant="dark" />
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #fff;
          background: #070707;
        }
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: radial-gradient(1200px circle at 18% 10%, rgba(255, 255, 255, 0.14), transparent 62%),
            radial-gradient(900px circle at 82% 24%, rgba(138, 180, 255, 0.10), transparent 55%),
            radial-gradient(800px circle at 50% 90%, rgba(255, 255, 255, 0.06), transparent 60%),
            linear-gradient(to bottom, #070707, #000);
        }
        .wrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 18px;
        }

        /* Layout */
        .layout {
          padding: 46px 0 18px;
          display: grid;
          gap: 18px;
        }
        .left {
          display: none;
        }
        .right {
          display: grid;
          gap: 10px;
          justify-items: center;
        }

        /* Text */
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 255, 255, 0.86);
        }
        .pillDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(138, 180, 255, 0.95);
          box-shadow: 0 0 0 4px rgba(138, 180, 255, 0.12);
        }
        .h1 {
          margin: 16px 0 0;
          font-size: 44px;
          letter-spacing: -1.2px;
          font-weight: 980;
          line-height: 1.05;
        }
        .muted {
          color: rgba(255, 255, 255, 0.72);
        }
        .p {
          margin: 12px 0 0;
          max-width: 560px;
          color: rgba(255, 255, 255, 0.74);
          line-height: 1.6;
        }

        /* Left list */
        .leftStack {
          margin-top: 18px;
          display: grid;
          gap: 10px;
          max-width: 560px;
        }
        .leftItem {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 12px 14px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.35;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .leftCheck {
          display: inline-flex;
          width: 22px;
          height: 22px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.22);
          flex: 0 0 auto;
          margin-top: 1px;
        }
        .leftLinks {
          margin-top: 16px;
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .textLink {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          font-weight: 850;
          font-size: 13px;
        }
        .textLink:hover {
          color: #fff;
        }

        /* Card */
        .card {
          width: 100%;
          max-width: 460px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 38px 160px rgba(0, 0, 0, 0.55);
          padding: 18px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: "";
          position: absolute;
          inset: -140px auto auto -140px;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(138, 180, 255, 0.16), transparent 65%);
        }
        .cardTop {
          position: relative;
        }
        .cardTitle {
          margin: 0;
          font-size: 26px;
          font-weight: 980;
          letter-spacing: -0.6px;
        }
        .cardSub {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
          font-weight: 750;
        }

        .error {
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.10);
          color: rgba(254, 202, 202, 0.95);
          padding: 12px;
          font-weight: 850;
          font-size: 13px;
          line-height: 1.35;
          position: relative;
        }

        /* OR */
        .orRow {
          margin: 14px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }
        .line {
          height: 1px;
          flex: 1;
          background: rgba(255, 255, 255, 0.10);
        }
        .or {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 850;
        }

        /* Form */
        .form {
          display: grid;
          gap: 12px;
          margin-top: 6px;
          position: relative;
        }
        .label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.82);
        }
        .input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.26);
          padding: 11px 12px;
          color: #fff;
          outline: none;
          font-size: 14px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .input:focus {
          border-color: rgba(138, 180, 255, 0.35);
          background: rgba(0, 0, 0, 0.32);
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.38);
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease;
          text-decoration: none;
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
        .btnLg {
          padding: 12px 14px;
        }
        .btnPrimary {
          background: #fff;
          color: #0a0a0a;
        }
        .btnPrimary:hover:enabled {
          background: rgba(255, 255, 255, 0.92);
        }
        .btnGhost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .btnGhost:hover:enabled {
          background: rgba(255, 255, 255, 0.10);
        }

        /* Bottom links */
        .bottomLinks {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          position: relative;
        }
        .bottomLinks :global(a) {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          font-weight: 850;
        }
        .bottomLinks :global(a:hover) {
          color: #fff;
        }

        .legalLinks {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          position: relative;
        }
        .legalLinks :global(a) {
          color: rgba(255, 255, 255, 0.65);
          text-decoration: none;
          font-weight: 850;
        }
        .legalLinks :global(a:hover) {
          color: #fff;
        }
        .dot {
          opacity: 0.35;
          font-weight: 900;
        }

        .fine {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          text-align: center;
          max-width: 460px;
        }
        .fine :global(a) {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          font-weight: 850;
        }
        .fine :global(a:hover) {
          color: #fff;
        }

        .footerWrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 10px 18px 22px;
        }

        @media (min-width: 980px) {
          .layout {
            grid-template-columns: 1.05fr 0.95fr;
            align-items: center;
            gap: 26px;
            padding: 54px 0 18px;
          }
          .left {
            display: block;
            padding-right: 10px;
          }
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <LoginInner />
    </Suspense>
  );
}
