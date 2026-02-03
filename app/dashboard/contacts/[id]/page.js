"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ContactProfilePage() {
  const params = useParams();
  const contactId = params?.id;

  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contact, setContact] = useState(null);

  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);

  const [showOnlyActiveDeal, setShowOnlyActiveDeal] = useState(false);

  // Forms
  const [noteForm, setNoteForm] = useState({
    deal_id: "",
    body: "",
  });

  const [dealForm, setDealForm] = useState({
    title: "",
    status: "lead",
    value: "",
  });

  const [taskForm, setTaskForm] = useState({
    deal_id: "",
    title: "",
    description: "",
    due_at: "",
  });

  const [eventForm, setEventForm] = useState({
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
      window.location.href = `/login?next=/dashboard/contacts/${contactId}`;
      return null;
    }
    return data.session;
  }

  function getActiveDealId() {
    return contact?.active_deal_id || "";
  }

  function getDealNameById(id) {
    const d = deals.find((x) => x.id === id);
    return d?.title || "—";
  }

  function filteredByDeal(list, dealId) {
    if (!dealId) return list;
    return list.filter((x) => x.deal_id === dealId);
  }

  const activeDealId = getActiveDealId();

  const visibleNotes = showOnlyActiveDeal ? filteredByDeal(notes, activeDealId) : notes;
  const visibleTasks = showOnlyActiveDeal ? filteredByDeal(tasks, activeDealId) : tasks;
  const visibleEvents = showOnlyActiveDeal ? filteredByDeal(events, activeDealId) : events;

  const openTasksCount = tasks.filter((t) => !t.completed).length;

  const nextEvent = [...events]
    .filter((e) => e?.start_at)
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)))[0];

  const totalDealValue = deals.reduce((sum, d) => {
    const v = Number(d?.value ?? 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  function safeDate(x) {
    try {
      if (!x) return null;
      const d = new Date(x);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  function fmt(d) {
    const dt = safeDate(d);
    return dt ? dt.toLocaleString() : "—";
  }

  function timeAgo(iso) {
    const dt = safeDate(iso);
    if (!dt) return "—";
    const diffMs = Date.now() - dt.getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  async function loadAll() {
    if (!contactId) return;

    setErr("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      const [cRes, dRes, nRes, tRes, eRes] = await Promise.all([
        sb
          .from("contacts")
          .select("id, first_name, last_name, email, phone, created_at, user_id, active_deal_id")
          .eq("id", contactId)
          .single(),
        sb.from("deals").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
        sb.from("notes").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
        sb.from("tasks").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
        sb.from("calendar_events").select("*").eq("contact_id", contactId).order("start_at", { ascending: true }),
      ]);

      if (cRes.error) throw cRes.error;

      const otherErr =
        dRes.error?.message || nRes.error?.message || tRes.error?.message || eRes.error?.message || "";
      if (otherErr) setErr(otherErr);

      setContact(cRes.data || null);
      setDeals(Array.isArray(dRes.data) ? dRes.data : []);
      setNotes(Array.isArray(nRes.data) ? nRes.data : []);
      setTasks(Array.isArray(tRes.data) ? tRes.data : []);
      setEvents(Array.isArray(eRes.data) ? eRes.data : []);

      // keep forms in sync with active deal (only if user hasn't chosen a deal manually yet)
      const a = cRes.data?.active_deal_id || "";
      setNoteForm((p) => (p.deal_id ? p : { ...p, deal_id: a }));
      setTaskForm((p) => (p.deal_id ? p : { ...p, deal_id: a }));
      setEventForm((p) => (p.deal_id ? p : { ...p, deal_id: a }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load contact");
      setContact(null);
      setDeals([]);
      setNotes([]);
      setTasks([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      if (!contactId) return;

      const channel = sb.channel(`contact-${contactId}-rt`);
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
          if (mountedRef.current) loadAll();
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function setActiveDeal(dealIdOrNull) {
    setErr("");
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = { active_deal_id: dealIdOrNull || null };

      const { data, error } = await sb
        .from("contacts")
        .update(payload)
        .eq("id", contactId)
        .select("id, active_deal_id")
        .single();

      if (error) throw error;

      setContact((p) => ({ ...p, active_deal_id: data.active_deal_id }));

      // default forms to active deal
      const nextDeal = data.active_deal_id || "";
      setNoteForm((p) => ({ ...p, deal_id: nextDeal }));
      setTaskForm((p) => ({ ...p, deal_id: nextDeal }));
      setEventForm((p) => ({ ...p, deal_id: nextDeal }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to set active deal");
    }
  }

  async function addNote(e) {
    e.preventDefault();
    setErr("");

    const body = (noteForm.body || "").trim();
    if (!body) return setErr("Note can’t be empty.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const dealId = noteForm.deal_id ? noteForm.deal_id : null;

      const payload = {
        user_id: session.user.id,
        contact_id: contactId,
        deal_id: dealId,
        body,
      };

      const { data, error } = await sb.from("notes").insert([payload]).select("*").single();
      if (error) throw error;

      setNotes((prev) => [data, ...prev]);
      setNoteForm((p) => ({ ...p, body: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    setErr("");
    const ok = confirm("Delete this note?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("notes").delete().eq("id", noteId);
      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete note");
    }
  }

  async function addDeal(e) {
    e.preventDefault();
    setErr("");

    const title = (dealForm.title || "").trim();
    if (!title) return setErr("Deal title can’t be empty.");

    const valueNum =
      String(dealForm.value || "").trim() === "" ? 0 : Number(String(dealForm.value).replace(/,/g, ""));
    if (Number.isNaN(valueNum)) return setErr("Deal value must be a number.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = {
        user_id: session.user.id,
        contact_id: contactId,
        title,
        status: dealForm.status || "lead",
        value: valueNum,
      };

      const { data, error } = await sb.from("deals").insert([payload]).select("*").single();
      if (error) throw error;

      setDeals((prev) => [data, ...prev]);
      setDealForm({ title: "", status: "lead", value: "" });

      // If no active deal yet, auto-set this as active (big UX win)
      if (!activeDealId) {
        await setActiveDeal(data.id);
      }
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add deal");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    setErr("");

    const title = (taskForm.title || "").trim();
    if (!title) return setErr("Task title can’t be empty.");

    const due = taskForm.due_at ? new Date(taskForm.due_at) : null;
    const dueIso = due && !Number.isNaN(due.getTime()) ? due.toISOString() : null;

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const dealId = taskForm.deal_id ? taskForm.deal_id : null;

      const payload = {
        user_id: session.user.id,
        contact_id: contactId,
        deal_id: dealId,
        title,
        description: taskForm.description.trim() ? taskForm.description.trim() : null,
        due_at: dueIso,
        completed: false,
      };

      const { data, error } = await sb.from("tasks").insert([payload]).select("*").single();
      if (error) throw error;

      setTasks((prev) => [data, ...prev]);
      setTaskForm((p) => ({ ...p, title: "", description: "", due_at: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add task");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    setErr("");
    try {
      const session = await requireSession();
      if (!session) return;

      const { data, error } = await sb
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id)
        .select("*")
        .single();

      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update task");
    }
  }

  async function deleteTask(taskId) {
    setErr("");
    const ok = confirm("Delete this task?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("tasks").delete().eq("id", taskId);
      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete task");
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    setErr("");

    const title = (eventForm.title || "").trim();
    if (!title) return setErr("Event title can’t be empty.");
    if (!eventForm.start_at || !eventForm.end_at) return setErr("Start and end are required.");

    const start = new Date(eventForm.start_at);
    const end = new Date(eventForm.end_at);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setErr("Start/end time is invalid.");
    if (end.getTime() < start.getTime()) return setErr("End must be after start.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const dealId = eventForm.deal_id ? eventForm.deal_id : null;

      const payload = {
        user_id: session.user.id,
        contact_id: contactId,
        deal_id: dealId,
        title,
        location: eventForm.location.trim() ? eventForm.location.trim() : null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        notes: eventForm.notes.trim() ? eventForm.notes.trim() : null,
      };

      const { data, error } = await sb.from("calendar_events").insert([payload]).select("*").single();
      if (error) throw error;

      setEvents((prev) => {
        const next = [data, ...prev];
        next.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
        return next;
      });

      setEventForm((p) => ({ ...p, title: "", location: "", start_at: "", end_at: "", notes: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId) {
    setErr("");
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

  // ===== Activity Timeline (read-only) =====
  function buildTimelineItems({ dealsList, notesList, tasksList, eventsList, activeDeal, onlyActive }) {
    const dealFilter = onlyActive && activeDeal ? activeDeal : null;

    const filterDeal = (x) => {
      if (!dealFilter) return true;
      // Some items may have deal_id null
      return String(x?.deal_id || "") === String(dealFilter);
    };

    const items = [];

    // Notes
    for (const n of Array.isArray(notesList) ? notesList : []) {
      if (!filterDeal(n)) continue;
      items.push({
        type: "note",
        id: n.id,
        deal_id: n.deal_id || null,
        at: n.created_at || null,
        title: "Note added",
        body: n.body || "",
        meta: {
          dealTitle: n.deal_id ? getDealNameById(n.deal_id) : "—",
        },
      });
    }

    // Tasks
    for (const t of Array.isArray(tasksList) ? tasksList : []) {
      if (!filterDeal(t)) continue;
      items.push({
        type: "task",
        id: t.id,
        deal_id: t.deal_id || null,
        at: t.updated_at || t.created_at || null,
        title: t.completed ? "Task completed" : "Task created",
        body: t.title || "",
        sub: t.description || "",
        meta: {
          due: t.due_at || null,
          completed: !!t.completed,
          dealTitle: t.deal_id ? getDealNameById(t.deal_id) : "—",
        },
      });
    }

    // Calendar Events
    for (const ev of Array.isArray(eventsList) ? eventsList : []) {
      if (!filterDeal(ev)) continue;
      items.push({
        type: "event",
        id: ev.id,
        deal_id: ev.deal_id || null,
        at: ev.start_at || ev.created_at || null,
        title: "Event scheduled",
        body: ev.title || "Untitled event",
        sub: ev.start_at && ev.end_at ? `${fmt(ev.start_at)} → ${fmt(ev.end_at)}` : fmt(ev.start_at),
        meta: {
          location: ev.location || "",
          dealTitle: ev.deal_id ? getDealNameById(ev.deal_id) : "—",
        },
      });
    }

    // Deals (created + status)
    for (const d of Array.isArray(dealsList) ? dealsList : []) {
      if (dealFilter && String(d.id) !== String(dealFilter)) continue;

      items.push({
        type: "deal",
        id: d.id,
        deal_id: d.id,
        at: d.created_at || null,
        title: "Deal created",
        body: d.title || "Untitled deal",
        sub: d.status ? `Status: ${d.status}` : "",
        meta: {
          value: d.value ?? 0,
        },
      });
    }

    // Sort newest first by timestamp
    items.sort((a, b) => {
      const ad = safeDate(a.at)?.getTime() ?? 0;
      const bd = safeDate(b.at)?.getTime() ?? 0;
      return bd - ad;
    });

    return items;
  }

  function iconForType(type, meta) {
    if (type === "note") return "📝";
    if (type === "task") return meta?.completed ? "✅" : "☑️";
    if (type === "event") return "📅";
    if (type === "deal") return "🤝";
    return "•";
  }

  function pillForType(type) {
    if (type === "note") return { label: "Note", style: styles.tagNote };
    if (type === "task") return { label: "Task", style: styles.tagTask };
    if (type === "event") return { label: "Event", style: styles.tagEvent };
    if (type === "deal") return { label: "Deal", style: styles.tagDeal };
    return { label: "Item", style: styles.tagMuted };
  }

  if (loading) return <div style={{ opacity: 0.75 }}>Loading…</div>;

  if (!contact) {
    return (
      <div>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Contact</h1>
            <p style={styles.sub}>
              Activity log • Realtime: <span style={styles.badge}>{rtStatus}</span>
            </p>
          </div>
          <button onClick={loadAll} style={styles.btnGhost}>
            Refresh
          </button>
        </div>

        {err ? <div style={styles.alert}>{err}</div> : null}
        <div style={{ marginTop: 18, opacity: 0.75 }}>Contact not found.</div>
      </div>
    );
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Unnamed Contact";
  const email = contact.email || "—";
  const phone = contact.phone || "—";

  const timeline = buildTimelineItems({
    dealsList: deals,
    notesList: notes,
    tasksList: tasks,
    eventsList: events,
    activeDeal: activeDealId,
    onlyActive: showOnlyActiveDeal,
  });

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>{name}</h1>
          <p style={styles.sub}>
            Activity log • Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>

          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            {email} • {phone}
          </div>

          {/* Quick stats */}
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={styles.pill}>Open tasks: {openTasksCount}</span>
            <span style={styles.pill}>Deals: {deals.length}</span>
            <span style={styles.pill}>Total value: {totalDealValue}</span>
            <span style={styles.pill}>
              Next event: {nextEvent?.start_at ? new Date(nextEvent.start_at).toLocaleString() : "—"}
            </span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link href="/dashboard/contacts" style={styles.linkBtn}>
            Back
          </Link>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Active deal controls */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          style={styles.btnGhost}
          onClick={() => navigator.clipboard.writeText(email === "—" ? "" : String(email))}
          type="button"
        >
          Copy Email
        </button>
        <button
          style={styles.btnGhost}
          onClick={() => navigator.clipboard.writeText(phone === "—" ? "" : String(phone))}
          type="button"
        >
          Copy Phone
        </button>

        <span style={{ opacity: 0.65, fontSize: 12 }}>
          Active deal:{" "}
          <span style={{ fontWeight: 950, opacity: 0.95 }}>{activeDealId ? getDealNameById(activeDealId) : "None"}</span>
        </span>

        <button
          style={styles.btnGhost}
          onClick={() => setShowOnlyActiveDeal((p) => !p)}
          type="button"
          disabled={!activeDealId}
          title={!activeDealId ? "Set an active deal first" : ""}
        >
          {showOnlyActiveDeal ? "Showing: Active Deal Only" : "Showing: All Deals"}
        </button>

        {activeDealId ? (
          <button style={styles.btnGhost} onClick={() => setActiveDeal(null)} type="button">
            Clear Active Deal
          </button>
        ) : null}
      </div>

      {/* Timeline (NEW) */}
      <div style={{ marginTop: 18, ...styles.card }}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>
            Activity Timeline ({timeline.length}
            {showOnlyActiveDeal && activeDealId ? " filtered" : ""})
          </h2>
          <div style={{ opacity: 0.75, fontSize: 13, fontWeight: 900 }}>
            Newest first • {timeline.length ? `Last: ${timeAgo(timeline[0]?.at)}` : "No activity yet"}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>
            No activity yet. Add a note, task, event, or deal below — it will show up here.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {timeline.slice(0, 30).map((it) => {
              const tag = pillForType(it.type);
              const icon = iconForType(it.type, it.meta);
              const dealLabel = it.deal_id ? getDealNameById(it.deal_id) : "—";

              return (
                <div key={`${it.type}-${it.id}`} style={styles.timelineRow}>
                  <div style={styles.timelineLeft}>
                    <div style={styles.timelineIcon}>{icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ ...styles.tagBase, ...tag.style }}>{tag.label}</span>
                        <div style={{ fontWeight: 950 }}>{it.title}</div>
                        <div style={{ opacity: 0.65, fontSize: 12 }}>{fmt(it.at)} • {timeAgo(it.at)}</div>
                      </div>

                      <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5, opacity: 0.95 }}>
                        {it.body}
                      </div>

                      {it.sub ? (
                        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
                          {it.sub}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, opacity: 0.95 }}>
                        <div>
                          <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                          <span style={{ fontWeight: 900 }}>{dealLabel}</span>
                        </div>

                        {it.type === "task" && it.meta?.due ? (
                          <div>
                            <span style={{ opacity: 0.75 }}>Due:</span>{" "}
                            <span style={{ fontWeight: 900 }}>{fmt(it.meta.due)}</span>
                          </div>
                        ) : null}

                        {it.type === "event" && it.meta?.location ? (
                          <div>
                            <span style={{ opacity: 0.75 }}>Location:</span>{" "}
                            <span style={{ fontWeight: 900 }}>{it.meta.location}</span>
                          </div>
                        ) : null}

                        {it.type === "deal" ? (
                          <div>
                            <span style={{ opacity: 0.75 }}>Value:</span>{" "}
                            <span style={{ fontWeight: 900 }}>{it.meta?.value ?? 0}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div style={styles.timelineRight}>
                    {/* Optional: quick nav links (read-only) */}
                    {it.type === "deal" ? (
                      <Link href={`/dashboard/deals/${it.id}`} style={styles.timelineLink}>
                        Open Deal →
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {timeline.length > 30 ? (
              <div style={{ marginTop: 4, opacity: 0.7, fontSize: 12 }}>
                Showing newest 30 items. (We can add pagination later if needed.)
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {/* Deals */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Deals ({deals.length})</h2>
          </div>

          <form onSubmit={addDeal} style={styles.form}>
            <div style={styles.grid3}>
              <input
                value={dealForm.title}
                onChange={(e) => setDealForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Deal title..."
                style={styles.input}
              />

              <select
                value={dealForm.status}
                onChange={(e) => setDealForm((p) => ({ ...p, status: e.target.value }))}
                style={styles.select}
              >
                <option value="lead">lead</option>
                <option value="active">active</option>
                <option value="under_contract">under_contract</option>
                <option value="closed">closed</option>
                <option value="lost">lost</option>
              </select>

              <input
                value={dealForm.value}
                onChange={(e) => setDealForm((p) => ({ ...p, value: e.target.value }))}
                placeholder="Value (optional)"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={saving} style={styles.btnPrimary}>
              {saving ? "Saving..." : "Add Deal"}
            </button>
          </form>

          {deals.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 10 }}>No deals yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {deals.map((d) => (
                <div key={d.id} style={styles.item}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 950 }}>
                        <Link
                          href={`/dashboard/deals/${d.id}`}
                          style={{ color: "white", fontWeight: 950, textDecoration: "underline" }}
                        >
                          {d.title}
                        </Link>
                      </div>

                      <div style={{ opacity: 0.85, fontSize: 13 }}>
                        <span style={{ opacity: 0.75 }}>Status:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{d.status || "—"}</span>{" "}
                        <span style={{ opacity: 0.75 }}>• Value:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{d.value ?? 0}</span>
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        Created: {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDeal(d.id)}
                      style={d.id === activeDealId ? styles.btnPrimarySmall : styles.btnGhost}
                      title="Save as active deal on this contact"
                    >
                      {d.id === activeDealId ? "Active ✅" : "Set Active"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>
              Notes ({visibleNotes.length}
              {showOnlyActiveDeal && activeDealId ? " filtered" : ""})
            </h2>
          </div>

          <form onSubmit={addNote} style={styles.form}>
            <select
              value={noteForm.deal_id}
              onChange={(e) => setNoteForm((p) => ({ ...p, deal_id: e.target.value }))}
              style={styles.select}
            >
              <option value="">No deal (optional)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            <textarea
              value={noteForm.body}
              onChange={(e) => setNoteForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Write a note..."
              style={styles.textarea}
              rows={3}
            />

            <button type="submit" disabled={saving} style={styles.btnPrimary}>
              {saving ? "Saving..." : "Add Note"}
            </button>
          </form>

          {visibleNotes.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 10 }}>No notes yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {visibleNotes.map((n) => (
                <div key={n.id} style={styles.item}>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.body}</div>
                  <div style={styles.itemMeta}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ opacity: 0.75 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : "—"}</div>
                      <div style={{ opacity: 0.9 }}>
                        <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{n.deal_id ? getDealNameById(n.deal_id) : "—"}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteNote(n.id)} style={styles.btnDanger} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>
              Tasks ({visibleTasks.length}
              {showOnlyActiveDeal && activeDealId ? " filtered" : ""})
            </h2>
          </div>

          <form onSubmit={addTask} style={styles.form}>
            <select
              value={taskForm.deal_id}
              onChange={(e) => setTaskForm((p) => ({ ...p, deal_id: e.target.value }))}
              style={styles.select}
            >
              <option value="">No deal (optional)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title..."
              style={styles.input}
            />

            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)..."
              style={styles.textarea}
              rows={2}
            />

            <input
              type="datetime-local"
              value={taskForm.due_at}
              onChange={(e) => setTaskForm((p) => ({ ...p, due_at: e.target.value }))}
              style={{ ...styles.input, colorScheme: "dark" }}
            />

            <button type="submit" disabled={saving} style={styles.btnPrimary}>
              {saving ? "Saving..." : "Add Task"}
            </button>
          </form>

          {visibleTasks.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 10 }}>No tasks yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {visibleTasks.map((t) => (
                <div key={t.id} style={styles.item}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <button
                        onClick={() => toggleTask(t)}
                        style={t.completed ? styles.chkOn : styles.chkOff}
                        title={t.completed ? "Mark as open" : "Mark as done"}
                        type="button"
                      />
                      <div style={{ display: "grid", gap: 4 }}>
                        <div
                          style={{
                            fontWeight: 950,
                            opacity: t.completed ? 0.55 : 1,
                            textDecoration: t.completed ? "line-through" : "none",
                          }}
                        >
                          {t.title}
                        </div>
                        {t.description ? (
                          <div style={{ opacity: 0.85, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{t.description}</div>
                        ) : null}
                      </div>
                    </div>

                    <button onClick={() => deleteTask(t.id)} style={styles.btnDanger} type="button">
                      Delete
                    </button>
                  </div>

                  <div style={styles.itemMeta}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <span style={{ opacity: 0.75 }}>Due:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</span>
                      </div>
                      <div>
                        <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{t.deal_id ? getDealNameById(t.deal_id) : "—"}</span>
                      </div>
                    </div>

                    <div style={{ opacity: 0.75 }}>Created: {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>
              Calendar ({visibleEvents.length}
              {showOnlyActiveDeal && activeDealId ? " filtered" : ""})
            </h2>
          </div>

          <form onSubmit={addEvent} style={styles.form}>
            <select
              value={eventForm.deal_id}
              onChange={(e) => setEventForm((p) => ({ ...p, deal_id: e.target.value }))}
              style={styles.select}
            >
              <option value="">No deal (optional)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            <input
              value={eventForm.title}
              onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Event title..."
              style={styles.input}
            />

            <input
              value={eventForm.location}
              onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Location (optional)..."
              style={styles.input}
            />

            <div style={styles.grid2}>
              <input
                type="datetime-local"
                value={eventForm.start_at}
                onChange={(e) => setEventForm((p) => ({ ...p, start_at: e.target.value }))}
                style={{ ...styles.input, colorScheme: "dark" }}
              />
              <input
                type="datetime-local"
                value={eventForm.end_at}
                onChange={(e) => setEventForm((p) => ({ ...p, end_at: e.target.value }))}
                style={{ ...styles.input, colorScheme: "dark" }}
              />
            </div>

            <textarea
              value={eventForm.notes}
              onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)..."
              style={styles.textarea}
              rows={2}
            />

            <button type="submit" disabled={saving} style={styles.btnPrimary}>
              {saving ? "Saving..." : "Add Event"}
            </button>
          </form>

          {visibleEvents.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 10 }}>No events yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {visibleEvents.map((ev) => (
                <div key={ev.id} style={styles.item}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 950 }}>{ev.title}</div>
                      <div style={{ opacity: 0.85 }}>
                        {new Date(ev.start_at).toLocaleString()} → {new Date(ev.end_at).toLocaleString()}
                      </div>
                      {ev.location ? <div style={{ opacity: 0.8 }}>📍 {ev.location}</div> : null}
                      {ev.notes ? <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>{ev.notes}</div> : null}
                    </div>

                    <button onClick={() => deleteEvent(ev.id)} style={styles.btnDanger} type="button">
                      Delete
                    </button>
                  </div>

                  <div style={styles.itemMeta}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ opacity: 0.75 }}>Created: {ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"}</div>
                      <div>
                        <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                        <span style={{ fontWeight: 900 }}>{ev.deal_id ? getDealNameById(ev.deal_id) : "—"}</span>
                      </div>
                    </div>

                    <div style={{ opacity: 0.75 }}>Updated: {ev.updated_at ? new Date(ev.updated_at).toLocaleString() : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" },

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

  pill: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.95,
  },

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  linkBtn: {
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

  card: {
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  form: { marginTop: 12, display: "grid", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 },

  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
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

  btnPrimarySmall: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #f5f5f5",
    background: "#f5f5f5",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    height: "fit-content",
    fontSize: 13,
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
  },

  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 10,
  },

  itemMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
    borderTop: "1px solid #242424",
    opacity: 0.95,
    fontSize: 13,
    flexWrap: "wrap",
  },

  chkOff: {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
  },

  chkOn: {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "#f5f5f5",
    cursor: "pointer",
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

  // Timeline styles
  timelineRow: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
  },
  timelineLeft: { display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0, flex: 1 },
  timelineRight: { display: "flex", alignItems: "center" },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    placeItems: "center",
    fontSize: 16,
    flex: "0 0 auto",
  },
  timelineLink: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  tagBase: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  tagMuted: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    opacity: 0.9,
  },
  tagNote: {
    border: "1px solid rgba(59,130,246,0.28)",
    background: "rgba(59,130,246,0.10)",
    color: "#bfdbfe",
  },
  tagTask: {
    border: "1px solid rgba(16,185,129,0.28)",
    background: "rgba(16,185,129,0.10)",
    color: "#bbf7d0",
  },
  tagEvent: {
    border: "1px solid rgba(245,158,11,0.28)",
    background: "rgba(245,158,11,0.10)",
    color: "#fde68a",
  },
  tagDeal: {
    border: "1px solid rgba(168,85,247,0.28)",
    background: "rgba(168,85,247,0.10)",
    color: "#e9d5ff",
  },
};
