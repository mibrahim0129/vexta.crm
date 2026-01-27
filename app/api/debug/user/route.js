// app/api/debug/user/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on server",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(url, anon, {
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

    const { data, error } = await supabase.auth.getUser();
    return NextResponse.json({
      ok: true,
      user: data?.user || null,
      authError: error ? { message: error.message, name: error.name } : null,
      cookieNames: request.cookies.getAll().map((c) => c.name),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "debug route exception" },
      { status: 500 }
    );
  }
}
