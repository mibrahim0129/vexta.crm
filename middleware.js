// middleware.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  );

  // Refresh session (important for OAuth/cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;

  const isAuthPage =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/auth/callback");

  const isPublic =
    url.pathname === "/" ||
    url.pathname.startsWith("/api/stripe/webhook"); // keep webhook public

  const isDashboard = url.pathname.startsWith("/dashboard");

  // If trying to access dashboard without being logged in → send to login
  if (isDashboard && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in, don't allow login/signup pages (optional)
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Otherwise proceed
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/auth/callback"],
};
