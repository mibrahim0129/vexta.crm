// app/auth/callback/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request) {
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const next = reqUrl.searchParams.get("next") || "/dashboard";

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      const bad = new URL("/login", reqUrl.origin);
      bad.searchParams.set("error", "missing_supabase_env");
      return NextResponse.redirect(bad);
    }

    if (code) {
      const cookieStore = cookies();

      const supabase = createServerClient(url, anon, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const bad = new URL("/login", reqUrl.origin);
        bad.searchParams.set("error", "oauth_exchange_failed");
        return NextResponse.redirect(bad);
      }
    }

    return NextResponse.redirect(new URL(next, reqUrl.origin));
  } catch (e) {
    console.error("Auth callback error:", e);

    const bad = new URL("/login", reqUrl.origin);
    bad.searchParams.set("error", "callback_exception");
    return NextResponse.redirect(bad);
  }
}
