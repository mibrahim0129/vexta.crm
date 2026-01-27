// app/auth/callback/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function GET(request) {
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const next = reqUrl.searchParams.get("next") || "/dashboard";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=missing_supabase_env", reqUrl.origin));
  }

  // Create the redirect response FIRST
  const response = NextResponse.redirect(new URL(next, reqUrl.origin));

  try {
    // Create supabase client bound to request+response cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const bad = new URL("/login", reqUrl.origin);
        bad.searchParams.set("error", "oauth_exchange_failed");
        bad.searchParams.set("message", error.message);
        return NextResponse.redirect(bad);
      }
    }

    return response;
  } catch (e) {
    const bad = new URL("/login", reqUrl.origin);
    bad.searchParams.set("error", "callback_exception");
    bad.searchParams.set("message", e?.message || "unknown");
    return NextResponse.redirect(bad);
  }
}
