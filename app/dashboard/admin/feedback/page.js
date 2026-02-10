"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AdminFeedbackPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);

  const adminEmails = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/admin/feedback";
      return null;
    }
    return data.session;
  }

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      const me = String(session.user?.email || "").toLowerCase();

      // ✅ Admin gate (client-side)
      if (!adminEmails.length || !adminEmails.includes(me)) {
        router.replace("/dashboard");
        return;
      }

      // ✅ Server-side safe admin access via RPC
      // This avoids relaxing RLS on feedback table.
      const { data, error } = await sb.rpc("admin_feedback_list", { limit_count: 200 });

      if (error) throw error;

      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load feedback.");
      setItems([]);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Feedback Inbox</h1>
          <p style={styles.sub}>Admin-only view of feedback submissions.</p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={load} disabled={loading} style={styles.btnGhost} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <Link href="/dashboard/feedback" style={styles.btnGhost}>
            New feedback →
          </Link>
        </div>
      </div>

      {checking ? <div style={{ opacity: 0.75 }}>Checking access…</div> : null}

      {err ? (
        <div style={styles.alert}>
          {err}
          <div style={{ marginTop: 8, opacity: 0.8, fontWeight: 800 }}>
            If this says function not found, make sure you ran the SQL to create{" "}
            <span style={{ fontFamily: "monospace" }}>admin_feedback_list</span>.
          </div>
        </div>
      ) : null}

      <div style={styles.card}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Latest</h2>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13 }}>{items.length} items</div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No feedback yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {items.map((f) => (
              <div key={f.id} style={styles.item}>
                <div style={styles.itemTop}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={styles.pill}>{String(f.type || "—").toUpperCase()}</span>
                    {f.page ? <span style={styles.pillMuted}>{f.page}</span> : null}
                    {f.email ? <span style={styles.pillMuted}>{f.email}</span> : null}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 900 }}>
                    {f.created_at ? new Date(f.created_at).toLocaleString() : "—"}
                  </div>
                </div>

                <div style={styles.msg}>{f.message}</div>

                <div style={{ opacity: 0.65, fontSize: 12, fontWeight: 900 }}>
                  user_id: {String(f.user_id || "—")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  headerRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

  card: {
    marginTop: 14,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  },

  itemTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },

  msg: { whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 850, opacity: 0.95 },

  pill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 950,
    fontSize: 12,
  },

  pillMuted: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.9,
  },

  btnGhost: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    textDecoration: "none",
  },

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#1a0f0f",
    border: "1px solid #5a1f1f",
    color: "#ffd6d6",
    fontWeight: 900,
  },
};
