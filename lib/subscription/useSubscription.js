"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Hard-gating subscription hook (NO FREE TIER).
 *
 * Data source:
 * - Table: subscriptions
 * - Columns: user_id (uuid), status (text), access (bool), plan (text), current_period_end (timestamptz)
 *
 * Access rules:
 * - signed out => no access
 * - missing row => no access
 * - query error => no access
 * - access=true OR status in ACTIVE_STATUSES => access
 */
const ACTIVE_STATUSES = new Set([
  "ACTIVE",
  "TRIALING", // if you ever add trials later
  // You can include "PAST_DUE" if you want grace period. For now keep it strict.
]);

export function useSubscription() {
  const sb = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [sub, setSub] = useState({
    status: "LOADING",
    access: false,
    plan: "None",
    currentPeriodEnd: null,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const {
          data: { user },
          error: userErr,
        } = await sb.auth.getUser();

        if (userErr) throw userErr;

        // Not logged in => no access
        if (!user) {
          if (!alive) return;
          setSub({
            status: "SIGNED_OUT",
            access: false,
            plan: "None",
            currentPeriodEnd: null,
          });
          return;
        }

        // MAIN QUERY
        const { data, error } = await sb
          .from("subscriptions")
          .select("status, access, plan, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Subscription lookup failed (blocking access).", error?.message);
          if (!alive) return;
          setSub({
            status: "LOOKUP_ERROR",
            access: false,
            plan: "None",
            currentPeriodEnd: null,
          });
          return;
        }

        // No row => not subscribed yet => no access
        if (!data) {
          if (!alive) return;
          setSub({
            status: "NONE",
            access: false,
            plan: "None",
            currentPeriodEnd: null,
          });
          return;
        }

        const status = String(data.status || "UNKNOWN").toUpperCase();
        const explicitAccess = data.access !== null ? !!data.access : null;

        // Access if DB explicitly grants it OR Stripe status is active-ish
        const computedAccess = explicitAccess === true || ACTIVE_STATUSES.has(status);

        if (!alive) return;
        setSub({
          status,
          access: computedAccess,
          plan: data.plan || "Paid",
          currentPeriodEnd: data.current_period_end || null,
        });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message || "Failed to load subscription");
        // Fail-closed (NO FREE TIER)
        setSub({
          status: "ERROR",
          access: false,
          plan: "None",
          currentPeriodEnd: null,
        });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [sb]);

  return { loading, err, ...sub };
}
