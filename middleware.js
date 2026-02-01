// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const betaOpen = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  // If beta is open, do nothing
  if (betaOpen) return NextResponse.next();

  // Beta is closed: if user isn't logged in, block dashboard routes
  const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSbCookie) {
    return NextResponse.redirect(new URL("/beta-closed", req.url));
  }

  // Logged-in users will be checked for allowlist in the dashboard layout
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
