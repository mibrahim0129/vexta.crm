// lib/supabase/browser.js
import { createClient } from "@supabase/supabase-js";

let _client = null;

/**
 * Standard browser Supabase client (PKCE + localStorage).
 * Safe to call multiple times; returns a singleton in the browser.
 */
export function supabaseBrowser() {
  if (typeof window === "undefined") {
    // This should only be used in Client Components.
    // Returning null makes mistakes obvious in development.
    return null;
  }

  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _client = createClient(url, anon, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  return _client;
}
