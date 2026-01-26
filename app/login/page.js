// app/login/page.js
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirectTo");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
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
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed.");
        setLoading(false);
        return;
      }

      router.refresh();
      router.push(redirectTo);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-zinc-900" />
              <span className="text-lg font-semibold tracking-tight">Vexta</span>
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Log in</h1>
            <p className="mt-1 text-sm text-zinc-600">Access your CRM dashboard.</p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/signup" className="text-zinc-700 hover:text-zinc-900">
              Create an account
            </Link>
            <Link href="/" className="text-zinc-700 hover:text-zinc-900">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 text-zinc-900">
          <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
              <div className="h-5 w-40 rounded bg-zinc-200" />
              <div className="mt-4 h-4 w-64 rounded bg-zinc-200" />
              <div className="mt-8 h-10 w-full rounded bg-zinc-200" />
              <div className="mt-3 h-10 w-full rounded bg-zinc-200" />
              <div className="mt-4 h-10 w-full rounded bg-zinc-200" />
            </div>
          </div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
