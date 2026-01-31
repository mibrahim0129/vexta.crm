"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Soft gating
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

export default function CalendarPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();
  const canWrite = !subLoading && !!access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [events, setEvents] = useState([]);

  // Filters
  const [filterRange, setFilterRange] = useState("upcoming"); // upcoming | today | week | all
  const [filterContactId, setFilterContactId] = useState("all");
  const [filterDealId, setFilterDealId] = useState("all");

  // Form
  const [form, setForm] = useState({
    contact_id: "",
    deal_id: "",
    title: "",
    location: "",
    start_at: "",
    end_at: "",
    notes: "",
  });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/calendar";
      return null;
    }
    return data.session;
  }

  function requireWriteOrWarn(message) {
    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return false;
    }
    if (!canWrite) {
      setErr(message || "Upgrade required.");
      return false;
    }
    return true;
  }

  function startOfTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  function endOfTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  function endOfWeekLocal() {
    const start = startOfTodayLocal();
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  function sortEvents(list) {
    const next = [...list];
    next.sort((a, b) => String(a.start_at || "").localeCompare(String(b.start_at || "")));
    return next;
  }

  function groupByDay(list) {
    const map = new Map();

    for (const ev of list) {
      const d = ev?.start_at ? new Date(ev.start_at) : null;
      const key =
        d && !Number.isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          : "unknown";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }

    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => {
      const items = sortEvents(map.get(k) || []);
      return { key: k, items };
    });
  }

  function formatDayLabel(iso) {
    if (!iso) return "Unknown date";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTimeRange(startIso, endIso) {
    const s = startIso ? new Date(startIso) : null;
    const e = endIso ? new Date(endIso) : null;
    if (!s || Number.isNaN(s.getTime())) return "—";
    if (!e || Number.isNaN(e.getTime())) return s.toLocaleString();

    const sameDay =
      s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate();

    const sTime = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const eTime = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    if (sameDay) return `${sTime} → ${eTime}`;
    return `${s.toLocaleString()} → ${e.toLocaleString()}`;
  }

  async function loadContacts() {
    const { data, error } = await sb
      .from("contacts")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    setContacts(list);

    setForm((p) => {
      if (p.contact_id) return p;
      return list.length > 0 ? { ...p, contact_id: list[0].id } : p;
    });
  }

  async function loadDeals(contactIdForDeals) {
    let q = sb.from("deals").select("id, title, contact_id, created_at").order("created_at", { ascending: false });

    if (contactIdForDeals && contactIdForDeals !== "all") {
      q = q.eq("contact_id", contactIdForDeals);
    }

    const { data, error } = await q;
    if (error) throw error;

    setDeals(Array.isArray(data) ? data : []);
  }

  async function loadEvents() {
    const session = await requireSession();
    if (!session) return;

    setErr("");
    setLoading(true);

    try {
      const { data, error } = await sb
        .from("calendar_events")
        .select(
          `
            id,
            title,
            location,
            start_at,
            end_at,
            notes,
            contact_id,
            deal_id,
            created_at,
            updated_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
        )
        .order("start_at", { ascending: true });

      if (error) throw error;

      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const session = await requireSession();
      if (!session) return;

      await loadContacts();
      await loadDeals(filterContactId === "all" ? form.contact_id : filterContactId);
      await loadEvents();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    setErr("");

    if (!requireWriteOrWarn("Upgrade required to add calendar events.")) return;

    const title = (form.title || "").trim();
    if (!title) return setErr("Event title can’t be empty.");
    if (!form.contact_id) return setErr("Please select a contact.");
    if (!form.start_at || !form.end_at) return setErr("Start and end are required.");

    const start = new Date(form.start_at);
    const end = new Date(form.end_at);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setErr("Start/end time is invalid.");
    if (end.getTime() < start.getTime()) return setErr("End must be after start.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = {
        user_id: session.user.id,
        contact_id: form.contact_id,
        deal_id: form.deal_id ? form.deal_id : null,
        title,
        location: form.location.trim() ? form.location.trim() : null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        notes: form.notes.trim() ? form.notes.trim() : null,
      };

      const { data, error } = await sb
        .from("calendar_events")
        .insert([payload])
        .select(
          `
            id,
            title,
            location,
            start_at,
            end_at,
            notes,
            contact_id,
            deal_id,
            created_at,
            updated_at,
            contacts:contact_id ( id, first_name, last_name ),
            deals:deal_id ( id, title )
          `
        )
        .single();

      if (error) throw error;

      setEvents((prev) => sortEvents([data, ...prev]));
      setForm((p) => ({ ...p, title: "", location: "", start_at: "", end_at: "", notes: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId) {
    setErr("");

    if (!requireWriteOrWarn("Upgrade required to delete calendar events.")) return;

    const ok = confirm("Delete this event?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("calendar_events").delete().eq("id", eventId);
      if (error) throw error;

      setEvents((prev) => prev.filter((x) => x.id !== eventId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete event");
    }
  }

  // When filter contact changes, reload deals (keeps dropdown relevant)
  useEffect(() => {
    (async () => {
      await loadDeals(filterContactId === "all" ? form.contact_id : filterContactId);
      // Keep deal filter valid
      if (filterDealId !== "all" && filterContactId !== "all") {
        const d = deals.find((x) => x.id === filterDealId);
        if (d && d.contact_id !== filterContactId) setFilterDealId("all");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterContactId]);

  // When form.contact_id changes, refresh deals dropdown and clear deal selection if mismatch
  useEffect(() => {
    if (!form.contact_id) return;
    (async () => {
      await loadDeals(form.contact_id);

      if (form.deal_id) {
        const d = deals.find((x) => x.id === form.deal_id);
        if (d && d.contact_id !== form.contact_id) {
          setForm((p) => ({ ...p, deal_id: "" }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_id]);

  useEffect(() => {
    mountedRef.current = true;

    let channel;

    (async () => {
      await loadAll();

      channel = sb.channel("calendar-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
          if (mountedRef.current) loadEvents();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadContacts();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadDeals(filterContactId === "all" ? form.contact_id : filterContactId);
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));
    })();

    return () => {
      mountedRef.current = false;
      if (channel) sb.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filtering
  const now = new Date();
  const startToday = startOfTodayLocal();
  const endToday = endOfTodayLocal();
  const endWeek = endOfWeekLocal();

  const filteredEvents = events
    .filter((ev) => {
      if (filterContactId !== "all" && ev.contact_id !== filterContactId) return false;
      if (filterDealId !== "all" && ev.deal_id !== filterDealId) return false;

      const s = ev?.start_at ? new Date(ev.start_at) : null;
      if (!s || Number.isNaN(s.getTime())) return true;

      if (filterRange === "today") return s.getTime() >= startToday.getTime() && s.getTime() <= endToday.getTime();
      if (filterRange === "week") return s.getTime() >= startToday.getTime() && s.getTime() <= endWeek.getTime();
      if (filterRange === "upcoming") return s.getTime() >= now.getTime();
      return true; // all
    })
    .sort((a, b) => String(a.start_at || "").localeCompare(String(b.start_at || "")));

  const groups = groupByDay(filteredEvents);

  const hasContacts = contacts.length > 0;
  const canCreate = hasContacts && canWrite;

  const disableWrites = subLoading || !canWrite;

  return (
    <div>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.h1}>Calendar</h1>

            <span style={styles.pill}>{subLoading ? "Checking plan…" : `Plan: ${plan || "Free"}`}</span>

            <span style={styles.pill}>
              Realtime: <span style={{ fontWeight: 950 }}>{rtStatus}</span>
            </span>

            <span style={styles.pillMuted}>{loading ? "Loading…" : `${filteredEvents.length} events`}</span>
          </div>

          <p style={styles.sub}>Appointments, showings, calls, and deadlines — organized by day.</p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ Upgrade banner */}
      {!subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to use calendar"
            body="You can view events, but creating and deleting events requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Add Event */}
      <div style={styles.card}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Add Event</h2>
          {!subLoading && !access ? <div style={{ fontSize: 12, opacity: 0.8 }}>Writes are disabled until upgrade.</div> : null}
        </div>

        <form onSubmit={addEvent} style={styles.form}>
          <div style={styles.grid2}>
            <select
              value={form.contact_id}
              onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              style={styles.select}
              disabled={!canCreate || saving}
            >
              {contacts.length === 0 ? (
                <option value="">No contacts found</option>
              ) : (
                contacts.map((c) => {
                  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
                  return (
                    <option key={c.id} value={c.id}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>

            <select
              value={form.deal_id}
              onChange={(e) => setForm((p) => ({ ...p, deal_id: e.target.value }))}
              style={styles.select}
              disabled={!canCreate || saving}
            >
              <option value="">No deal (optional)</option>
              {deals
                .filter((d) => !form.contact_id || d.contact_id === form.contact_id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Event title..."
            style={styles.input}
            disabled={!canCreate || saving}
          />

          <input
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Location (optional)..."
            style={styles.input}
            disabled={!canCreate || saving}
          />

          <div style={styles.grid2}>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
              style={{ ...styles.input, colorScheme: "dark" }}
              disabled={!canCreate || saving}
            />

            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
              style={{ ...styles.input, colorScheme: "dark" }}
              disabled={!canCreate || saving}
            />
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes (optional)..."
            style={styles.textarea}
            rows={3}
            disabled={!canCreate || saving}
          />

          <button
            type="submit"
            disabled={!canCreate || saving}
            style={{
              ...styles.btnPrimary,
              ...(disableWrites
                ? {
                    opacity: 0.55,
                    cursor: "not-allowed",
                    border: "1px solid #2a2a2a",
                    background: "#141414",
                    color: "#bdbdbd",
                  }
                : {}),
            }}
          >
            {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Event"}
          </button>

          {!hasContacts ? (
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Add a contact first in{" "}
              <Link href="/dashboard/contacts" style={{ color: "white", fontWeight: 900 }}>
                Contacts
              </Link>
              .
            </div>
          ) : null}
        </form>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>{loading ? "Events (loading...)" : `Events (${filteredEvents.length})`}</h2>
        </div>

        <div style={styles.filters}>
          <select value={filterRange} onChange={(e) => setFilterRange(e.target.value)} style={styles.selectSmall}>
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="all">All</option>
          </select>

          <select value={filterContactId} onChange={(e) => setFilterContactId(e.target.value)} style={styles.selectSmall}>
            <option value="all">All contacts</option>
            {contacts.map((c) => {
              const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
              return (
                <option key={c.id} value={c.id}>
                  {name}
                </option>
              );
            })}
          </select>

          <select value={filterDealId} onChange={(e) => setFilterDealId(e.target.value)} style={styles.selectSmall}>
            <option value="all">All deals</option>
            {deals
              .filter((d) => (filterContactId === "all" ? true : d.contact_id === filterContactId))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Grouped list */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No events match your filters.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {groups.map((g) => {
              const label = g.key === "unknown" ? "Unknown date" : formatDayLabel(g.items[0]?.start_at);

              return (
                <div key={g.key} style={styles.dayGroup}>
                  <div style={styles.dayHeader}>
                    <div style={{ fontWeight: 950 }}>{label}</div>
                    <div style={styles.countPill}>{g.items.length}</div>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {g.items.map((ev) => {
                      const c = ev.contacts;
                      const d = ev.deals;

                      const contactName = c
                        ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                        : "Unknown";

                      const timeRange = formatTimeRange(ev.start_at, ev.end_at);

                      return (
                        <div key={ev.id} style={styles.eventCard}>
                          <div style={styles.eventTop}>
                            <div style={{ minWidth: 0 }}>
                              <div style={styles.eventTitleRow}>
                                <div style={styles.eventTitle}>{ev.title}</div>
                                <span style={styles.timeChip}>{timeRange}</span>
                              </div>

                              <div style={styles.eventChipsRow}>
                                {ev.location ? <span style={styles.grayChip}>📍 {ev.location}</span> : null}
                                {d?.title ? <span style={styles.grayChip}>Deal: {d.title}</span> : null}
                              </div>

                              {ev.notes ? (
                                <div style={{ opacity: 0.9, whiteSpace: "pre-wrap", lineHeight: 1.5, marginTop: 8 }}>
                                  {ev.notes}
                                </div>
                              ) : null}

                              <div style={styles.metaRow}>
                                <div>
                                  <span style={{ opacity: 0.7 }}>Contact:</span>{" "}
                                  {ev.contact_id ? (
                                    <Link href={`/dashboard/contacts/${ev.contact_id}`} style={styles.link}>
                                      {contactName}
                                    </Link>
                                  ) : (
                                    <span>{contactName}</span>
                                  )}
                                </div>

                                <div style={{ opacity: 0.7 }}>
                                  Updated: {ev.updated_at ? new Date(ev.updated_at).toLocaleString() : "—"}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => deleteEvent(ev.id)}
                              style={{
                                ...styles.btnDanger,
                                ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                              }}
                              type="button"
                              disabled={disableWrites}
                              title={subLoading ? "Checking plan…" : !canWrite ? "Upgrade required" : "Delete event"}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" },

  titleRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 8, opacity: 0.75 },

  pill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
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

  countPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    fontWeight: 900,
    fontSize: 12,
  },

  timeChip: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  grayChip: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 850,
    fontSize: 12,
    opacity: 0.95,
    whiteSpace: "nowrap",
  },

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  card: {
    marginTop: 18,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },

  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },

  filters: { marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

  form: { marginTop: 12, display: "grid", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
  },

  selectSmall: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
  },

  textarea: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
    resize: "vertical",
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
  },

  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #f5f5f5",
    background: "#f5f5f5",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    width: "fit-content",
  },

  btnDanger: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    cursor: "pointer",
    fontWeight: 950,
    height: "fit-content",
    whiteSpace: "nowrap",
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

  dayGroup: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
  },

  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottom: "1px solid #242424",
  },

  eventCard: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  eventTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },

  eventTitleRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  eventTitle: { fontWeight: 950, fontSize: 16 },

  eventChipsRow: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" },

  metaRow: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    fontSize: 13,
    opacity: 0.95,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.10)",
  },

  link: { color: "white", fontWeight: 950, textDecoration: "underline" },
};
