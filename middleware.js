// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  // No auth gating here (we're handling auth/subscription checks in-app)
  // Keep middleware minimal to avoid redirect loops.
  return NextResponse.next();
}

export const config = {
  // Only run middleware on app-protected areas.
  // Do NOT include /login, /signup, or /auth/callback here unless you're actively doing redirects.
  matcher: ["/dashboard/:path*"],
};
