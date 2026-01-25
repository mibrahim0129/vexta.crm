"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function CalendarPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");

  const [view, setView] = useState("week"); // today | week | all

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: ev }, { data: cs }, { data: ds }] = await Promise.all([
        sb.from("calendar_events").select("*").order("starts_at", { ascending: true }),
        sb.from("contacts").select("id, name").order("name", { ascending: true }),
        sb.from("deals").select("id, title, contact_id").order("created_at", { ascending: false }),
      ]);

      setEvents(Array.isArray(ev) ? ev : []);
      setContacts(Array.isArray(cs) ? cs : []);
      setDeals(Array.isArray(ds) ? ds : []);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

    const channel = sb
      .channel("calendar-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => loadAll()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEvent(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (!startsAt) return alert("Pick a start time");

    try {
      await sb.from("calendar_events").insert({
        title: t,
        starts_at: startsAt,
        ends_at: endsAt || null,
        contact_id: contactId || null,
        deal_id: dealId || null,
      });

      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setContactId("");
      setDealId("");
    } catch (e2) {
      console.error(e2);
      alert("Failed to add event");
    }
  }

  async function removeEvent(id) {
    if (!confirm("Delete this event?")) return;
    try {
      await sb.from("calendar_events").delete().eq("id", id);
    } catch (e) {
      console.error(e);
      alert("Failed to delete event");
    }
  }

  const contactNameById = useMemo(() => {
    const m = new Map();
    contacts.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [contacts]);

  const dealTitleById = useMemo(() => {
    const m = new Map();
    deals.forEach((d) => m.set(d.id, d.title));
    return m;
  }, [deals]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (view === "all") return events;

    if (view === "today") {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 1);
      return events.filter((ev) => {
        const s = new Date(ev.starts_at);
        return s >= startOfToday && s < end;
      });
    }

    // week
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 7);

    return events.filter((ev) => {
      const s = new Date(ev.starts_at);
      return s >= startOfToday && s < end;
    });
  }, [events, view]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((ev) => {
      const d = new Date(ev.starts_at);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return Array.from(map.entries()).map(([k, arr]) => [k, arr]);
  }, [filtered]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Calendar</h1>
          <div style={styles.sub}>Events tied to contacts & deals.</div>
        </div>

        <div style={styles.headerBtns}>
          <button onClick={loadAll} style={styles.btn}>
            Refresh
          </button>
          <Link href="/dashboard/tasks" style={styles.btnGhost}>
            Tasks
          </Link>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Add event</div>

          <form onSubmit={addEvent} style={styles.form}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Event title (showing, call, inspection, closing...)"
            />

            <div style={styles.row2}>
              <input
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                style={styles.input}
                type="datetime-local"
              />
              <input
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                style={styles.input}
                type="datetime-local"
              />
            </div>

            <div style={styles.row2}>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                style={styles.select}
              >
                <option value="">Link to Contact (optional)</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                style={styles.select}
              >
                <option value="">Link to Deal (optional)</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <button style={styles.primary} type="submit">
              Add Event
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <div style={styles.controls}>
            <div style={styles.tabs}>
              {["today", "week", "all"].map((t) => (
                <button
                  key={t}
                  onClick={() => setView(t)}
                  style={{ ...styles.tab, ...(view === t ? styles.tabActive : {}) }}
                  type="button"
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.muted}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={styles.muted}>No events in this view.</div>
            ) : (
              grouped.map(([day, items]) => (
                <div key={day} style={styles.group}>
                  <div style={styles.groupTitle}>{day}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {items.map((ev) => {
                      const s = new Date(ev.starts_at).toLocaleString();
                      const e = ev.ends_at ? new Date(ev.ends_at).toLocaleString() : "";
                      const cn = contactNameById.get(ev.contact_id);
                      const dt = dealTitleById.get(ev.deal_id);

                      return (
                        <div key={ev.id} style={styles.item}>
                          <div style={{ minWidth: 0 }}>
                            <div style={styles.title}>{ev.title}</div>
                            <div style={styles.meta}>
                              <span>Start: {s}</span>
                              {e ? <span>• End: {e}</span> : null}
                              {cn ? <span>• Contact: {cn}</span> : null}
                              {dt ? <span>• Deal: {dt}</span> : null}
                            </div>
                          </div>
                          <button onClick={() => removeEvent(ev.id)} style={styles.trash} type="button">
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { color: "white" },
  headerRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  h1: { margin: 0, fontSize: 34, letterSpacing: -0.6 },
  sub: { opacity: 0.7, fontWeight: 800, marginTop: 6 },

  headerBtns: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  },

  grid: { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 },
  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
  },
  cardTitle: { fontWeight: 950, marginBottom: 10 },

  form: { display: "grid", gap: 10 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  input: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 800,
  },
  select: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 800,
  },
  primary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "white",
    color: "black",
    fontWeight: 950,
    cursor: "pointer",
  },

  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  tabs: { display: "flex", gap: 8 },
  tab: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 12,
  },
  tabActive: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.22)",
  },

  list: { marginTop: 12, display: "grid", gap: 14 },
  muted: { opacity: 0.7, fontWeight: 800, padding: 10 },

  group: { display: "grid", gap: 10 },
  groupTitle: { fontWeight: 950, opacity: 0.9 },

  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
  },
  title: { fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { marginTop: 6, fontSize: 12, opacity: 0.75, display: "flex", gap: 8, flexWrap: "wrap" },

  trash: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    fontWeight: 950,
    cursor: "pointer",
    flexShrink: 0,
  },
};
