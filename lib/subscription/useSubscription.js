"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Soft-gating subscription hook.
 *
 * EXPECTED DATA SOURCE (adjust ONE place if needed):
 * - Table: subscriptions
 * - Columns: user_id (uuid), status (text), access (bool), plan (text), current_period_end (timestamptz)
 *
 * If your project uses a different table/view, update the query in load().
 */
export function useSubscription() {
  const sb = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [sub, setSub] = useState({
    status: "UNKNOWN",
    access: true, // default to true so you don't accidentally lock everyone out
    plan: "Free",
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

        // Not logged in → treat as no access to paid actions
        if (!user) {
          if (!alive) return;
          setSub({
            status: "SIGNED_OUT",
            access: false,
            plan: "Free",
            currentPeriodEnd: null,
          });
          return;
        }

        // ---- MAIN QUERY (edit here if your schema differs) ----
        const { data, error } = await sb
          .from("subscriptions")
          .select("status, access, plan, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        // If the table doesn't exist or row is missing, we default to Free access=true.
        // (You can change this default if you want Free users to be blocked.)
        if (error) {
          // If your schema isn't "subscriptions", this is where you'd adjust.
          console.warn("Subscription lookup failed (defaulting to Free).", error?.message);
          if (!alive) return;
          setSub({
            status: "FREE_DEFAULT",
            access: true,
            plan: "Free",
            currentPeriodEnd: null,
          });
          return;
        }

        if (!alive) return;

        // No row means Free user (or not subscribed yet)
        if (!data) {
          setSub({
            status: "FREE",
            access: true,
            plan: "Free",
            currentPeriodEnd: null,
          });
          return;
        }

        setSub({
          status: (data.status || "UNKNOWN").toUpperCase(),
          access: data.access !== null ? !!data.access : true,
          plan: data.plan || "Free",
          currentPeriodEnd: data.current_period_end || null,
        });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message || "Failed to load subscription");
        // Fail-open so you don’t accidentally lock paying users out during transient errors
        setSub((s) => ({ ...s, access: true }));
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
