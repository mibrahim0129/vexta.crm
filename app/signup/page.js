// app/signup/page.js
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
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

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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
      const supabase = createSupabaseBrowserClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // If confirm email is ON, they’ll confirm then login.
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                  "/dashboard"
                )}`
              : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Signup failed.");
        setLoading(false);
        return;
      }

      if (!data?.session) {
        setNotice(
          "Account created. Check your email to confirm your account, then log in."
        );
        setLoading(false);
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
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
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
            "/dashboard"
          )}`,
        },
      });

      if (error) {
        setError(error.message || "Google sign-up failed.");
        setOauthLoading(false);
      }
    } catch (e) {
      setError("Google sign-up failed. Please try again.");
      setOauthLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(255,255,255,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_35%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2">
        {/* Left panel */}
        <div className="hidden md:block">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white" />
            <span className="text-lg font-semibold tracking-tight">Vexta</span>
          </Link>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Build your pipeline with clarity.
          </h1>
          <p className="mt-3 max-w-md text-white/70">
            Create an account and start organizing clients, deals, tasks, and events
            in a workflow you’ll actually stick with.
          </p>

          <div className="mt-8 grid gap-3 max-w-md">
            {[
              "Link tasks + events to contacts (and deals)",
              "See what’s overdue and what’s next",
              "Close out deal files faster",
            ].map((t) => (
              <div
                key={t}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75"
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            <div className="md:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-white" />
                <span className="text-lg font-semibold tracking-tight">Vexta</span>
              </Link>
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:mt-0">
              Create account
            </h2>
            <p className="mt-1 text-sm text-white/60">Start using your CRM in minutes.</p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            ) : null}

            <button
              type="button"
              onClick={signUpWithGoogle}
              disabled={oauthLoading || loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
            >
              <GoogleIcon />
              {oauthLoading ? "Connecting..." : "Sign up with Google"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <div className="text-xs text-white/50">or</div>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/80">Password</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/80">
                  Confirm password
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create account"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link href="/login" className="text-white/70 hover:text-white">
                Already have an account?
              </Link>
              <Link href="/" className="text-white/70 hover:text-white">
                Back to home
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-white/45">
            By continuing, you agree to basic terms and privacy.
          </p>
        </div>
      </div>
    </main>
  );
}
