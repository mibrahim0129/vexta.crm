"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const POLL_MS = 1500;
const MAX_MS = 45000;

// statuses that should grant access
const OK = new Set(["active", "trialing"]);

export default function SuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const sessionId = sp.get("session_id") || "";

  const [stage, setStage] = useState("starting"); // starting | polling | done | timeout | error
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let alive = true;
    let t = null;
    const startAt = Date.now();

    async function run() {
      try {
        setStage("starting");
        setMsg("");

        // Ensure logged in
        const { data: u } = await sb.auth.getUser();
        const userEmail = u?.user?.email || "";
        if (!alive) return;

        setEmail(userEmail);

        if (!userEmail) {
          setStage("error");
          setMsg("You must be logged in to complete setup.");
          return;
        }

        setStage("polling");
        setMsg("Finalizing your subscription…");

        async function pollOnce() {
          // ✅ Pull subscription state from YOUR DB (via hook/table)
          // We’ll read from a common subscriptions table if you have it.
          // If your schema differs, paste it and I’ll adjust.
          const { data, error } = await sb
            .from("subscriptions")
            .select("status, plan, current_period_end")
            .eq("email", userEmail)
            .maybeSingle();

          if (!alive) return;

          if (error) {
            // keep polling; webhook might be delayed
            return;
          }

          if (data) {
            setDetails(data);

            const st = (data.status || "").toLowerCase();
            if (OK.has(st)) {
              setStage("done");
              setMsg("Success! Redirecting…");
              router.replace("/dashboard");
              return;
            }
          }
        }

        // first poll immediately
        await pollOnce();

        // then repeat until MAX_MS
        t = setInterval(async () => {
          if (!alive) return;
          if (Date.now() - startAt > MAX_MS) {
            clearInterval(t);
            setStage("timeout");
            setMsg(
              "Still syncing payment. You can go to Billing or Dashboard—access may take a moment to update."
            );
            return;
          }
          await pollOnce();
        }, POLL_MS);
      } catch (e) {
        if (!alive) return;
        setStage("error");
        setMsg(e?.message || "Something went wrong.");
      }
    }

    run();

    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [sb, router, sessionId]);

  return (
    <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1 className="h1">Payment successful</h1>

      <p className="p" style={{ opacity: 0.85, marginTop: 8 }}>
        {msg || "Finalizing your access…"}
      </p>

      {email ? (
        <p className="p" style={{ opacity: 0.7, marginTop: 6, fontSize: 14 }}>
          Signed in as <b>{email}</b>
        </p>
      ) : null}

      {details ? (
        <div className="card" style={{ marginTop: 18, maxWidth: 720 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 14, opacity: 0.8 }}>Subscription</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              Status: {details.status || "unknown"}
            </div>
            {details.plan ? (
              <div style={{ fontSize: 14, opacity: 0.85 }}>Plan: {details.plan}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn" href="/dashboard">
          Go to dashboard
        </Link>
        <Link className="btn secondary" href="/billing">
          Billing
        </Link>
        {stage === "timeout" || stage === "error" ? (
          <Link className="btn secondary" href="/pricing">
            Pricing
          </Link>
        ) : null}
      </div>

      {stage === "timeout" ? (
        <p className="p" style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          If access doesn’t unlock within a minute, open Billing and make sure the subscription is active.
        </p>
      ) : null}
    </main>
  );
}
