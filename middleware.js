// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  // Protect dashboard routes: require an auth cookie
  // Supabase stores auth in cookies that start with "sb-"
  const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!hasSbCookie) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
