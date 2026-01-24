"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function CalendarPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [events, setEvents] = useState([]);

  const [range, setRange] = useState("upcoming"); // upcoming | all

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

  async function loadContacts() {
    const { data, error } = await sb
      .from("contacts")
      .select("id, first_name, last_name")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    setContacts(list);

    if (!form.contact_id && list.length > 0) {
      setForm((p) => ({ ...p, contact_id: list[0].id }));
    }
  }

  async function loadDeals(contactId) {
    let q = sb.from("deals").select("id, title, contact_id").order("created_at", { ascending: false });
    if (contactId) q = q.eq("contact_id", contactId);

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
      let q = sb
        .from("calendar_events")
        .select(
          `
          id, title, location, start_at, end_at, notes, created_at,
          contact_id, deal_id,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .order("start_at", { ascending: true });

      if (range === "upcoming") {
        q = q.gte("start_at", new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString());
      }

      const { data, error } = await q;
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
      const cid = form.contact_id || null;
      await loadDeals(cid);
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

    const title = form.title.trim();
    if (!title) return setErr("Event title is required.");
    if (!form.start_at) return setErr("Start date/time is required.");

    try {
      const session = await requireSession();
      if (!session) return;

      const startIso = new Date(form.start_at).toISOString();
      const endIso = form.end_at ? new Date(form.end_at).toISOString() : null;

      const { data, error } = await sb
        .from("calendar_events")
        .insert([
          {
            user_id: session.user.id,
            contact_id: form.contact_id || null,
            deal_id: form.deal_id || null,
            title,
            location: form.location.trim() || null,
            start_at: startIso,
            end_at: endIso,
            notes: form.notes.trim() || null,
          },
        ])
        .select(
          `
          id, title, location, start_at, end_at, notes, created_at,
          contact_id, deal_id,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .single();

      if (error) throw error;

      setEvents((p) => [...p, data].sort((a, b) => new Date(a.start_at) - new Date(b.start_at)));
      setForm((p) => ({ ...p, title: "", location: "", start_at: "", end_at: "", notes: "" }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add event");
    }
  }

  async function deleteEvent(id) {
    setErr("");
    const ok = confirm("Delete this event?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("calendar_events").delete().eq("id", id);
      if (error) throw error;

      setEvents((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete event");
    }
  }

  useEffect(() => {
    if (!form.contact_id) return;
    (async () => {
      await loadDeals(form.contact_id);
      setForm((p) => ({ ...p, deal_id: "" }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_id]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      const channel = sb.channel("calendar-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
          if (mountedRef.current) loadEvents();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadAll();
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
          <h1 style={styles.h1}>Calendar</h1>
          <p style={styles.sub}>
            Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>
        </div>

        <div style={styles.headerRight}>
          <select value={range} onChange={(e) => setRange(e.target.value)} style={styles.selectSmall}>
            <option value="upcoming">Upcoming</option>
            <option value="all">All</option>
          </select>

          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Event</h2>

        <form onSubmit={addEvent} style={styles.form}>
          <div style={styles.grid2}>
            <select
              value={form.contact_id}
              onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              style={styles.select}
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
              disabled={deals.length === 0}
            >
              <option value="">No deal (optional)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Event title (ex: Showing at 3PM)"
            style={styles.input}
          />

          <div style={styles.grid2}>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
              style={styles.input}
            />
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
              style={styles.input}
              placeholder="End (optional)"
            />
          </div>

          <input
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Location (optional)"
            style={styles.input}
          />

          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes (optional)"
            style={styles.textarea}
            rows={3}
          />

          <button type="submit" style={styles.btnPrimary} disabled={contacts.length === 0}>
            Add Event
          </button>

          {contacts.length === 0 ? (
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

      <div style={{ marginTop: 18 }}>
        <h2 style={styles.h2}>
          Events {loading ? "(loading...)" : `(${events.length})`}
        </h2>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No events yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {events.map((ev) => {
              const c = ev.contacts;
              const d = ev.deals;

              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "No contact";

              const start = ev.start_at ? new Date(ev.start_at).toLocaleString() : "";
              const end = ev.end_at ? new Date(ev.end_at).toLocaleString() : "";

              return (
                <div key={ev.id} style={styles.item}>
                  <div style={styles.itemTop}>
                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <div style={{ fontWeight: 950 }}>{ev.title}</div>
                      <div style={styles.meta}>
                        {start}
                        {end ? ` → ${end}` : ""}{" "}
                        {ev.location ? ` • ${ev.location}` : ""}
                      </div>
                      <div style={styles.meta}>
                        Contact:{" "}
                        {ev.contact_id ? (
                          <Link href={`/dashboard/contacts/${ev.contact_id}`} style={styles.link}>
                            {contactName}
                          </Link>
                        ) : (
                          <span>{contactName}</span>
                        )}
                        {d?.title ? (
                          <>
                            {" "}
                            • Deal: <b>{d.title}</b>
                          </>
                        ) : null}
                      </div>
                      {ev.notes ? <div style={{ opacity: 0.8, fontSize: 13 }}>{ev.notes}</div> : null}
                    </div>

                    <button onClick={() => deleteEvent(ev.id)} style={styles.btnDanger}>
                      Delete
                    </button>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", gap: 10, alignItems: "center" },
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
  h2: { margin: 0, fontSize: 18, fontWeight: 900 },
  card: {
    marginTop: 18,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },
  form: { marginTop: 12, display: "grid", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
  },
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
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 13,
    height: "fit-content",
  },
  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
  },
  itemTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },
  link: { color: "white", fontWeight: 950, textDecoration: "underline" },
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
