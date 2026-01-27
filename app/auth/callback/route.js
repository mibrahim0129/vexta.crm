// app/auth/callback/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

export async function GET(request) {
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const next = reqUrl.searchParams.get("next") || "/dashboard";

  try {
    if (code) {
      const supabase = createRouteHandlerClient({ cookies });
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        const bad = new URL("/login", reqUrl.origin);
        bad.searchParams.set("error", "oauth_exchange_failed");
        bad.searchParams.set("message", error.message);
        return NextResponse.redirect(bad);
      }
    }

    return NextResponse.redirect(new URL(next, reqUrl.origin));
  } catch (e) {
    const bad = new URL("/login", reqUrl.origin);
    bad.searchParams.set("error", "callback_exception");
    bad.searchParams.set("message", e?.message || "unknown");
    return NextResponse.redirect(bad);
  }
}
