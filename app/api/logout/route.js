import { NextResponse } from "next/server";

const COOKIE_NAME = "crm_auth";

function clearCookie(res) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCookie(res);
  return res;
}

// optional: allow GET /api/logout for convenience
export async function GET() {
  const url = new URL("/login", "http://localhost");
  const res = NextResponse.redirect(url);
  clearCookie(res);
  return res;
}
