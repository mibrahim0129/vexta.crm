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
    return NextResponse.json(
      { ok: false, error: "missing_supabase_env" },
      { status: 500 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "missing_code", hint: "No ?code= in URL" },
      { status: 400 }
    );
  }

  // We'll attach cookies to THIS response
  const res = NextResponse.json({ ok: true, next });

  const cookiesSet = [];

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesSet.push(name);
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    return NextResponse.json({
      ok: !error,
      next,
      exchangeError: error ? { message: error.message, name: error.name } : null,
      sessionUser: data?.session?.user?.email || null,
      cookiesSet,
      cookieNamesInRequest: request.cookies.getAll().map((c) => c.name),
      note:
        "If exchangeError exists, fix Supabase Auth URL config / provider config. If ok=true but cookiesSet is empty, cookie write is failing.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "callback_exception", cookiesSet },
      { status: 500 }
    );
  }
}
