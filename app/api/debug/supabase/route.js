// app/api/debug/supabase/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function refFromSupabaseUrl(url) {
  try {
    const u = new URL(url);
    // tkikydggudkxqtnyxzlp.supabase.co
    return u.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

export async function GET(request) {
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  const cookieRef =
    cookieNames
      .map((n) => {
        const m = n.match(/^sb-([a-z0-9]+)-/i);
        return m ? m[1] : null;
      })
      .find(Boolean) || null;

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const envRef = refFromSupabaseUrl(envUrl);

  return NextResponse.json({
    ok: true,
    cookieRef,
    envRef,
    envUrlPresent: !!envUrl,
    envAnonPresent: !!envAnon,
    envUrl,
    cookieNames,
    note:
      "cookieRef and envRef MUST match. If not, fix Vercel env vars to the correct Supabase project.",
  });
}
