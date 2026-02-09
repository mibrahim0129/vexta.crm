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

    async function run() {
      try {
        setStage("starting");
        setMsg("");

        // Ensure logged in
        const { data } = await sb.auth.getSession();
        const session = data?.session;

        if (!session) {
          router.replace(`/login?next=${encodeURIComponent("/billing/success?session_id=" + sessionId)}`);
          return;
        }

        if (!alive) return;
        setEmail(session.user?.email || "");

        setStage("polling");
        setMsg("Activating your subscription…");

        const start = Date.now();

        while (alive && Date.now() - start < MAX_MS) {
          // Read subscription row directly (webhook should be updating it)
          const { data: row, error } = await sb
            .from("subscriptions")
            .select("status, access, plan, current_period_end, stripe_customer_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!alive) return;

          if (!error && row) {
            setDetails(row);

            const statusOk = row.status && OK.has(String(row.status).toLowerCase());
            const accessOk = row.access === true;

            if (statusOk || accessOk) {
              setStage("done");
              setMsg("You’re all set. Redirecting to your dashboard…");
              // small delay for a nicer feel
              t = setTimeout(() => {
                router.replace("/dashboard?welcome=1");
                router.refresh();
              }, 600);
              return;
            }
          }

          // Wait + retry
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, POLL_MS));
        }

        if (!alive) return;
        setStage("timeout");
        setMsg(
          "Your payment went through, but activation is taking longer than expected. This is usually just a webhook delay."
        );
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setStage("error");
        setMsg(e?.message || "Something went wrong while activating your subscription.");
      }
    }

    run();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function openPortal() {
    try {
      const { data } = await sb.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent("/billing/success?session_id=" + sessionId)}`);
        return;
      }

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ returnTo: "/billing/success?session_id=" + sessionId }),
      });

      const json = await res.json();
      if (json?.url) window.location.href = json.url;
      else alert(json?.error || "Could not open billing portal.");
    } catch (e) {
      alert(e?.message || "Could not open billing portal.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.05)",
          boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: -0.2 }}>
          {stage === "done" ? "Payment successful" : "Finalizing your subscription"}
        </div>

        <div style={{ marginTop: 10, opacity: 0.8, fontWeight: 800, lineHeight: 1.45 }}>
          {msg || "One moment…"}
        </div>

        {email ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>Signed in as {email}</div>
        ) : null}

        {details ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.20)",
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Subscription status</div>
            <div style={{ display: "grid", gap: 4 }}>
              <div>
                <span style={{ opacity: 0.7 }}>status:</span> <span style={{ fontWeight: 900 }}>{details.status || "—"}</span>
              </div>
              <div>
                <span style={{ opacity: 0.7 }}>plan:</span> <span style={{ fontWeight: 900 }}>{details.plan || "—"}</span>
              </div>
              <div>
                <span style={{ opacity: 0.7 }}>access:</span>{" "}
                <span style={{ fontWeight: 900 }}>{details.access ? "true" : "false"}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Go to dashboard
          </Link>

          <button
            onClick={openPortal}
            type="button"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Open billing portal
          </button>

          <Link
            href="/pricing"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              fontWeight: 900,
              textDecoration: "none",
              opacity: 0.9,
            }}
          >
            Back to pricing
          </Link>
        </div>

        {stage === "timeout" ? (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65, fontWeight: 800, lineHeight: 1.45 }}>
            If this keeps happening, it usually means your webhook isn’t reaching Vercel or the subscription row isn’t
            being written. Double-check Stripe webhook delivery + Supabase table columns.
          </div>
        ) : null}
      </div>
    </main>
  );
}
