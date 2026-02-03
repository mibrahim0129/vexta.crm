// app/dashboard/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Beta-only demo seeding (no helpers)
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [counts, setCounts] = useState({
    contacts: 0,
    deals: 0,
    notes: 0,
    openTasks: 0,
    upcomingEvents: 0,
  });

  const [recentDeals, setRecentDeals] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [seeding, setSeeding] = useState(false);

  // ✅ New: global activity feed (mixed)
  const [activity, setActivity] = useState([]);

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard";
      return null;
    }
    return data.session;
  }

  function safeName(c) {
    if (!c) return "Unknown";
    return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
  }

  function fmtDate(d) {
    try {
      return d ? new Date(d).toLocaleString() : "—";
    } catch {
      return "—";
    }
  }

  function timeAgo(iso) {
    try {
      const d = iso ? new Date(iso) : null;
      if (!d || Number.isNaN(d.getTime())) return "—";
      const diff = Date.now() - d.getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const days = Math.floor(h / 24);
      return `${days}d ago`;
    } catch {
      return "—";
    }
  }

  function buildActivityItem(type, row) {
    // Normalize a mixed item format for rendering
    if (type === "note") {
      return {
        type,
        id: row.id,
        at: row.created_at,
        title: "Note added",
        body: row.body || "",
        contact_id: row.contact_id || null,
        deal_id: row.deal_id || null,
        contact: row.contacts || null,
        deal: row.deals || null,
      };
    }

    if (type === "task") {
      return {
        type,
        id: row.id,
        at: row.updated_at || row.created_at,
        title: row.completed ? "Task completed" : "Task created",
        body: row.title || "",
        sub: row.due_at ? `Due: ${fmtDate(row.due_at)}` : "",
        contact_id: row.contact_id || null,
        deal_id: row.deal_id || null,
        contact: row.contacts || null,
        deal: row.deals || null,
        meta: { completed: !!row.completed },
      };
    }

    if (type === "event") {
      const range =
        row.start_at && row.end_at ? `${fmtDate(row.start_at)} → ${fmtDate(row.end_at)}` : fmtDate(row.start_at);
      return {
        type,
        id: row.id,
        at: row.start_at || row.created_at,
        title: "Event scheduled",
        body: row.title || "Untitled event",
        sub: range,
        contact_id: row.contact_id || null,
        deal_id: row.deal_id || null,
        contact: row.contacts || null,
        deal: row.deals || null,
        meta: { location: row.location || "" },
      };
    }

    if (type === "deal") {
      return {
        type,
        id: row.id,
        at: row.created_at,
        title: "Deal created",
        body: row.title || "Untitled deal",
        sub: row.status ? `Status: ${row.status}` : "",
        contact_id: row.contact_id || null,
        deal_id: row.id,
        contact: row.contacts || null,
        deal: { id: row.id, title: row.title || "Untitled deal" },
        meta: { value: row.value ?? 0 },
      };
    }

    return null;
  }

  function iconFor(item) {
    if (item.type === "note") return "📝";
    if (item.type === "task") return item?.meta?.completed ? "✅" : "☑️";
    if (item.type === "event") return "📅";
    if (item.type === "deal") return "🤝";
    return "•";
  }

  function tagStyle(item) {
    if (item.type === "note") return styles.tagNote;
    if (item.type === "task") return styles.tagTask;
    if (item.type === "event") return styles.tagEvent;
    if (item.type === "deal") return styles.tagDeal;
    return styles.tagMuted;
  }

  function tagLabel(item) {
    if (item.type === "note") return "Note";
    if (item.type === "task") return "Task";
    if (item.type === "event") return "Event";
    if (item.type === "deal") return "Deal";
    return "Item";
  }

  async function seedDemoDataIfNeeded(session) {
    if (!isBeta) return; // ✅ only seed in beta
    if (!session?.user?.id) return;

    const userId = session.user.id;
    const seedKey = `vexta_demo_seeded_${userId}`;

    // If we already seeded for this user, don’t do it again.
    if (typeof window !== "undefined" && localStorage.getItem(seedKey) === "1") return;

    setSeeding(true);

    try {
      // Only seed if user is brand new (no core data yet)
      const [c1, c2, c3] = await Promise.all([
        sb.from("contacts").select("id", { count: "exact", head: true }),
        sb.from("deals").select("id", { count: "exact", head: true }),
        sb.from("notes").select("id", { count: "exact", head: true }),
      ]);

      if (c1.error) throw c1.error;
      if (c2.error) throw c2.error;
      if (c3.error) throw c3.error;

      const hasAnything = (c1.count || 0) > 0 || (c2.count || 0) > 0 || (c3.count || 0) > 0;
      if (hasAnything) {
        if (typeof window !== "undefined") localStorage.setItem(seedKey, "1");
        return;
      }

      // 1) Create contact
      const { data: contact, error: contactErr } = await sb
        .from("contacts")
        .insert([
          {
            user_id: userId,
            first_name: "Ava",
            last_name: "Martinez",
          },
        ])
        .select("id, first_name, last_name")
        .single();

      if (contactErr) throw contactErr;

      // 2) Create deal linked to contact
      const { data: deal, error: dealErr } = await sb
        .from("deals")
        .insert([
          {
            user_id: userId,
            contact_id: contact.id,
            title: "Buy-side: 2BR Condo Search",
            status: "Warm",
            value: 350000,
          },
        ])
        .select("id, title")
        .single();

      if (dealErr) throw dealErr;

      // 3) Create note linked to contact + deal
      const { error: noteErr } = await sb.from("notes").insert([
        {
          user_id: userId,
          contact_id: contact.id,
          deal_id: deal.id,
          body:
            "Demo note: Client prefers a north-facing unit, wants to be near transit. Budget up to $350k. Next step: send 5 listings + schedule 2 showings.",
        },
      ]);

      if (noteErr) throw noteErr;

      // 4) Create task linked to contact + deal
      const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const { error: taskErr } = await sb.from("tasks").insert([
        {
          user_id: userId,
          contact_id: contact.id,
          deal_id: deal.id,
          title: "Send listing shortlist + confirm showing times",
          description: "Demo task: text client 2 showing windows and send 5 listings.",
          due_at: due.toISOString(),
          completed: false,
        },
      ]);

      if (taskErr) console.warn("Demo seed: tasks insert failed:", taskErr?.message);

      // 5) Create calendar event linked to contact + deal
      const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      start.setHours(11, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const { error: calErr } = await sb.from("calendar_events").insert([
        {
          user_id: userId,
          contact_id: contact.id,
          deal_id: deal.id,
          title: "Showing (Demo): 1234 W Sample St",
          location: "1234 W Sample St",
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          notes: "Demo event: bring comps + confirm lockbox code with listing agent.",
        },
      ]);

      if (calErr) console.warn("Demo seed: calendar_events insert failed:", calErr?.message);

      if (typeof window !== "undefined") localStorage.setItem(seedKey, "1");

      setOk("Demo data added (beta). You can now explore Contacts, Deals, Notes, Tasks, and Calendar.");
    } catch (e) {
      console.error(e);
      setErr((prev) => prev || e?.message || "Demo seed failed");
    } finally {
      setSeeding(false);
    }
  }

  async function loadDashboard() {
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      // ✅ Seed demo data first (only for empty accounts)
      await seedDemoDataIfNeeded(session);

      // Counts (include open tasks + upcoming events)
      const nowIso = new Date().toISOString();

      const [c1, c2, c3, openTasks, upcomingEvents, d, n, tasksRes, eventsRes, dealsRes] = await Promise.all([
        sb.from("contacts").select("id", { count: "exact", head: true }),
        sb.from("deals").select("id", { count: "exact", head: true }),
        sb.from("notes").select("id", { count: "exact", head: true }),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("completed", false),
        sb.from("calendar_events").select("id", { count: "exact", head: true }).gte("start_at", nowIso),

        // Recent Deals (existing)
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

        // Recent Notes (existing)
        sb
          .from("notes")
          .select(
            `
            id, body, contact_id, deal_id, created_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
          )
          .order("created_at", { ascending: false })
          .limit(5),

        // ✅ Activity sources (recent)
        sb
          .from("tasks")
          .select(
            `
            id, title, description, completed, due_at, contact_id, deal_id, created_at, updated_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
          )
          .order("created_at", { ascending: false })
          .limit(10),

        sb
          .from("calendar_events")
          .select(
            `
            id, title, location, start_at, end_at, notes, contact_id, deal_id, created_at, updated_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
          )
          .order("start_at", { ascending: false })
          .limit(10),

        sb
          .from("deals")
          .select(
            `
            id, title, status, value, contact_id, created_at,
            contacts:contact_id ( id, first_name, last_name )
          `
          )
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (c1.error) throw c1.error;
      if (c2.error) throw c2.error;
      if (c3.error) throw c3.error;
      if (openTasks.error) throw openTasks.error;
      if (upcomingEvents.error) throw upcomingEvents.error;

      if (d.error) throw d.error;
      if (n.error) throw n.error;
      if (tasksRes.error) throw tasksRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (dealsRes.error) throw dealsRes.error;

      setCounts({
        contacts: c1.count || 0,
        deals: c2.count || 0,
        notes: c3.count || 0,
        openTasks: openTasks.count || 0,
        upcomingEvents: upcomingEvents.count || 0,
      });

      setRecentDeals(Array.isArray(d.data) ? d.data : []);
      setRecentNotes(Array.isArray(n.data) ? n.data : []);

      // ✅ Build mixed activity feed (notes + tasks + events + deals)
      const noteItems = (Array.isArray(n.data) ? n.data : []).map((row) => buildActivityItem("note", row));
      const taskItems = (Array.isArray(tasksRes.data) ? tasksRes.data : []).map((row) => buildActivityItem("task", row));
      const eventItems = (Array.isArray(eventsRes.data) ? eventsRes.data : []).map((row) => buildActivityItem("event", row));
      const dealItems = (Array.isArray(dealsRes.data) ? dealsRes.data : []).map((row) => buildActivityItem("deal", row));

      const merged = [...noteItems, ...taskItems, ...eventItems, ...dealItems].filter(Boolean);

      merged.sort((a, b) => {
        const ad = a?.at ? new Date(a.at).getTime() : 0;
        const bd = b?.at ? new Date(b.at).getTime() : 0;
        return bd - ad;
      });

      setActivity(merged.slice(0, 15));
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
        // ✅ NEW: refresh dashboard when tasks/events change too
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          if (mountedRef.current) loadDashboard();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
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

  const isEmpty =
    (counts.contacts || 0) === 0 &&
    (counts.deals || 0) === 0 &&
    (counts.notes || 0) === 0 &&
    (counts.openTasks || 0) === 0 &&
    (counts.upcomingEvents || 0) === 0;

  return (
    <div>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.h1}>Dashboard</h1>
          <p style={styles.sub}>
            Welcome back • Realtime: <span style={styles.badge}>{rtStatus}</span>
            {isBeta ? <span style={{ marginLeft: 8, ...styles.badgeMuted }}>Beta</span> : null}
            {seeding ? <span style={{ marginLeft: 8, ...styles.badgeMuted }}>Seeding demo data…</span> : null}
          </p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadDashboard} disabled={loading} style={styles.btnGhost} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}
      {ok ? <div style={styles.ok}>{ok}</div> : null}

      {/* Quick actions */}
      <div style={styles.actionsRow}>
        <Link href="/dashboard/contacts" style={styles.actionBtn}>
          + New Contact
        </Link>
        <Link href="/dashboard/deals" style={styles.actionBtn}>
          + New Deal
        </Link>
        <Link href="/dashboard/notes" style={styles.actionBtn}>
          + Add Note
        </Link>
        <Link href="/dashboard/tasks" style={styles.actionBtn}>
          + Add Task
        </Link>
        <Link href="/dashboard/calendar" style={styles.actionBtn}>
          + Add Event
        </Link>
        <div style={{ ...styles.actionHint }}>Tip: Start with a contact → attach deals, notes, tasks, and calendar events.</div>
      </div>

      <div style={styles.stats}>
        <Stat title="Contacts" value={counts.contacts} href="/dashboard/contacts" />
        <Stat title="Deals" value={counts.deals} href="/dashboard/deals" />
        <Stat title="Notes" value={counts.notes} href="/dashboard/notes" />
        <Stat title="Open Tasks" value={counts.openTasks} href="/dashboard/tasks" />
        <Stat title="Upcoming Events" value={counts.upcomingEvents} href="/dashboard/calendar" />
      </div>

      {isEmpty && !loading ? (
        <div style={styles.emptyCard}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Your CRM is empty.</div>
          <div style={{ marginTop: 6, opacity: 0.75, lineHeight: 1.45 }}>
            Create a contact first, then add a deal and a note. Tasks + Calendar will make you move faster.
          </div>

          <div style={styles.emptyBtns}>
            <Link href="/dashboard/contacts" style={styles.btnPrimary}>
              Create your first contact
            </Link>
            <button onClick={loadDashboard} style={styles.btnGhost} type="button">
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {/* ✅ NEW: Recent Activity (global feed) */}
      <div style={styles.cardWide}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Recent Activity</h2>
          <div style={{ opacity: 0.7, fontWeight: 900, fontSize: 12 }}>
            {loading ? "Loading…" : `${activity.length} items`}
          </div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : activity.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No activity yet. Add a note, task, or event to see it here.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {activity.map((it) => {
              const contactName = safeName(it.contact);
              const dealTitle = it.deal?.title || (it.deal_id ? "View deal" : "—");

              const contactHref = it.contact_id ? `/dashboard/contacts/${it.contact_id}` : null;
              const dealHref = it.deal_id ? `/dashboard/deals/${it.deal_id}` : null;

              const preview = String(it.body || "").trim().slice(0, 170);

              return (
                <div key={`${it.type}-${it.id}`} style={styles.item}>
                  <div style={styles.activityTopRow}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16 }}>{iconFor(it)}</span>
                      <span style={{ ...styles.tagBase, ...tagStyle(it) }}>{tagLabel(it)}</span>
                      <div style={{ fontWeight: 950 }}>{it.title}</div>
                      <div style={{ opacity: 0.65, fontSize: 12, fontWeight: 900 }}>
                        {it.at ? `${timeAgo(it.at)} • ${fmtDate(it.at)}` : "—"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {contactHref ? (
                        <Link href={contactHref} style={styles.linkPill}>
                          {contactName}
                        </Link>
                      ) : (
                        <span style={styles.linkPillMuted}>{contactName}</span>
                      )}

                      {dealHref ? (
                        <Link href={dealHref} style={styles.linkPill}>
                          {dealTitle}
                        </Link>
                      ) : it.deal_id ? (
                        <span style={styles.linkPillMuted}>{dealTitle}</span>
                      ) : null}
                    </div>
                  </div>

                  {preview ? (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, opacity: 0.95 }}>
                      {preview}
                      {String(it.body || "").length > 170 ? "…" : ""}
                    </div>
                  ) : null}

                  {it.sub ? <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>{it.sub}</div> : null}

                  {it?.meta?.location ? (
                    <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>📍 {it.meta.location}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Your existing two cards */}
      <div className="grid2" style={styles.grid}>
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
                const contactName = c ? safeName(c) : "No contact";

                return (
                  <div key={d.id} style={styles.item}>
                    <div style={styles.itemTopRow}>
                      <div style={{ fontWeight: 950, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {d.title}
                      </div>
                      <span style={styles.pill}>{String(d.status || "—")}</span>
                    </div>

                    <div style={styles.meta}>
                      Contact:{" "}
                      <Link href={`/dashboard/contacts/${d.contact_id}`} style={styles.link}>
                        {contactName}
                      </Link>{" "}
                      • Value: <b>${Number(d.value || 0).toLocaleString()}</b>
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
                const contactName = c ? safeName(c) : "Unknown";
                const preview = String(n.body || "").slice(0, 160);

                return (
                  <div key={n.id} style={styles.item}>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, opacity: 0.95 }}>
                      {preview}
                      {String(n.body || "").length > 160 ? "…" : ""}
                    </div>

                    <div style={styles.metaRow}>
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

                      <div style={styles.metaRight}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .grid2 {
            grid-template-columns: 1fr !important;
          }
          .stats5 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  headerRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

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

  badgeMuted: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.9,
  },

  actionsRow: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  actionBtn: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
    textDecoration: "none",
  },

  actionHint: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    fontWeight: 850,
    fontSize: 12,
    opacity: 0.75,
  },

  stats: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
  },

  stat: {
    textDecoration: "none",
    color: "white",
    padding: 16,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 8,
    transition: "transform 0.05s ease",
  },

  grid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  cardWide: {
    marginTop: 14,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

  card: { padding: 16, border: "1px solid #242424", borderRadius: 16, background: "#111111" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#101010",
    display: "grid",
    gap: 10,
  },

  itemTopRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },

  activityTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },

  pill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
    opacity: 0.95,
  },

  // ✅ Tags for activity
  tagBase: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  tagNote: { border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.10)" },
  tagTask: { border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)" },
  tagEvent: { border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.10)" },
  tagDeal: { border: "1px solid rgba(168,85,247,0.35)", background: "rgba(168,85,247,0.10)" },
  tagMuted: { opacity: 0.8 },

  linkPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 950,
    fontSize: 12,
    textDecoration: "none",
    maxWidth: 240,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  linkPillMuted: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.8)",
    fontWeight: 950,
    fontSize: 12,
    maxWidth: 240,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },

  metaRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" },
  metaRight: { opacity: 0.6, fontSize: 12, fontWeight: 900 },

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
    textDecoration: "none",
  },

  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #f5f5f5",
    background: "#f5f5f5",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  emptyBtns: { marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#1a0f0f",
    border: "1px solid #5a1f1f",
    color: "#ffd6d6",
    fontWeight: 900,
  },

  ok: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    color: "rgba(220, 252, 231, 0.95)",
    fontWeight: 900,
  },
};
