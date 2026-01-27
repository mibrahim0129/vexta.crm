// app/auth/callback/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs"; // keeps it stable on Vercel

export async function GET(request) {
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const next = reqUrl.searchParams.get("next") || "/dashboard";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Always redirect somewhere (never 500)
  const redirectOk = NextResponse.redirect(new URL(next, reqUrl.origin));
  const redirectBad = (reason) => {
    const bad = NextResponse.redirect(new URL(`/login?error=${reason}`, reqUrl.origin));
    return bad;
  };

  try {
    if (!url || !anon) return redirectBad("missing_supabase_env");

    // If no code, just go to next
    if (!code) return redirectOk;

    // IMPORTANT: set cookies on the RESPONSE, not via next/headers cookies()
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectOk.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectBad("oauth_exchange_failed");

    return redirectOk;
  } catch (e) {
    console.error("Auth callback exception:", e);
    return redirectBad("callback_exception");
  }
}
