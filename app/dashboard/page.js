"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [counts, setCounts] = useState({ contacts: 0, deals: 0, notes: 0 });
  const [recentDeals, setRecentDeals] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard";
      return null;
    }
    return data.session;
  }

  async function loadDashboard() {
    setErr("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      const [c1, c2, c3, d, n] = await Promise.all([
        sb.from("contacts").select("id", { count: "exact", head: true }),
        sb.from("deals").select("id", { count: "exact", head: true }),
        sb.from("notes").select("id", { count: "exact", head: true }),
        sb
          .from("deals")
          .select(
            `
            id, title, status, value, contact_id, created_at,
            contacts:contact_id ( id, first_name, last_name )
          `
          )
          .order("created_at", { ascending: false })
          .limit(5),
        sb
          .from("notes")
          .select(
            `
            id, body, contact_id, created_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (c1.error) throw c1.error;
      if (c2.error) throw c2.error;
      if (c3.error) throw c3.error;
      if (d.error) throw d.error;
      if (n.error) throw n.error;

      setCounts({
        contacts: c1.count || 0,
        deals: c2.count || 0,
        notes: c3.count || 0,
      });

      setRecentDeals(Array.isArray(d.data) ? d.data : []);
      setRecentNotes(Array.isArray(n.data) ? n.data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadDashboard();

      const channel = sb.channel("dashboard-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadDashboard();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadDashboard();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
          if (mountedRef.current) loadDashboard();
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Dashboard</h1>
          <p style={styles.sub}>
            Welcome back • Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>
        </div>

        <button onClick={loadDashboard} disabled={loading} style={styles.btnGhost}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.stats}>
        <Stat title="Contacts" value={counts.contacts} href="/dashboard/contacts" />
        <Stat title="Deals" value={counts.deals} href="/dashboard/deals" />
        <Stat title="Notes" value={counts.notes} href="/dashboard/notes" />
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <h2 style={styles.h2}>Recent Deals</h2>
            <Link href="/dashboard/deals" style={styles.linkSmall}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : recentDeals.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No deals yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentDeals.map((d) => {
                const c = d.contacts;
                const contactName = c
                  ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                  : "No contact";

                return (
                  <div key={d.id} style={styles.item}>
                    <div style={{ fontWeight: 950 }}>{d.title}</div>
                    <div style={styles.meta}>
                      Contact:{" "}
                      <Link href={`/dashboard/contacts/${d.contact_id}`} style={styles.link}>
                        {contactName}
                      </Link>{" "}
                      • Status: <b>{d.status}</b> • Value: ${Number(d.value || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTop}>
            <h2 style={styles.h2}>Recent Notes</h2>
            <Link href="/dashboard/notes" style={styles.linkSmall}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : recentNotes.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No notes yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentNotes.map((n) => {
                const c = n.contacts;
                const contactName = c
                  ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                  : "Unknown";

                const preview = String(n.body || "").slice(0, 140);

                return (
                  <div key={n.id} style={styles.item}>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {preview}
                      {String(n.body || "").length > 140 ? "…" : ""}
                    </div>
                    <div style={styles.meta}>
                      Contact:{" "}
                      <Link href={`/dashboard/contacts/${n.contact_id}`} style={styles.link}>
                        {contactName}
                      </Link>
                      {n.deals?.title ? (
                        <>
                          {" "}
                          • Deal: <b>{n.deals.title}</b>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, href }) {
  return (
    <Link href={href} style={styles.stat}>
      <div style={{ opacity: 0.7, fontWeight: 900, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 950 }}>{value}</div>
      <div style={styles.linkSmall}>Open →</div>
    </Link>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

  badge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
  },

  stats: { marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },

  stat: {
    textDecoration: "none",
    color: "white",
    padding: 16,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 8,
  },

  grid: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  card: { padding: 16, border: "1px solid #242424", borderRadius: 16, background: "#111111" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#101010",
    display: "grid",
    gap: 6,
  },

  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },

  link: { color: "white", fontWeight: 950, textDecoration: "underline" },
  linkSmall: { color: "white", fontWeight: 900, textDecoration: "underline", fontSize: 13 },

  btnGhost: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
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
