"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DealProfilePage() {
  const params = useParams();
  const dealId = params?.id;

  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [deal, setDeal] = useState(null);
  const [contact, setContact] = useState(null);

  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);

  // Edit deal
  const [edit, setEdit] = useState({ title: "", status: "lead", value: "" });

  // Add note/task/event
  const [noteBody, setNoteBody] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", due_at: "" });
  const [eventForm, setEventForm] = useState({ title: "", location: "", start_at: "", end_at: "", notes: "" });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = `/login?next=/dashboard/deals/${dealId}`;
      return null;
    }
    return data.session;
  }

  async function loadAll() {
    if (!dealId) return;

    setErr("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      const dRes = await sb.from("deals").select("*").eq("id", dealId).single();
      if (dRes.error) throw dRes.error;

      const d = dRes.data;

      const [cRes, nRes, tRes, eRes] = await Promise.all([
        d?.contact_id
          ? sb.from("contacts").select("id, first_name, last_name, email, phone").eq("id", d.contact_id).single()
          : Promise.resolve({ data: null, error: null }),
        sb.from("notes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
        sb.from("tasks").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
        sb.from("calendar_events").select("*").eq("deal_id", dealId).order("start_at", { ascending: true }),
      ]);

      const otherErr = cRes.error?.message || nRes.error?.message || tRes.error?.message || eRes.error?.message || "";
      if (otherErr) setErr(otherErr);

      setDeal(d);
      setContact(cRes.data || null);

      setNotes(nRes.data || []);
      setTasks(tRes.data || []);
      setEvents(eRes.data || []);

      setEdit({
        title: d.title || "",
        status: d.status || "lead",
        value: String(d.value ?? ""),
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load deal");
      setDeal(null);
      setContact(null);
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

      if (!dealId) return;

      const channel = sb.channel(`deal-${dealId}-rt`);
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => mountedRef.current && loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => mountedRef.current && loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => mountedRef.current && loadAll())
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_events" },
          () => mountedRef.current && loadAll()
        )
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function saveDeal(e) {
    e.preventDefault();
    setErr("");

    const title = (edit.title || "").trim();
    if (!title) return setErr("Deal title can’t be empty.");

    const valueNum = String(edit.value || "").trim() === "" ? 0 : Number(String(edit.value).replace(/,/g, ""));
    if (Number.isNaN(valueNum)) return setErr("Deal value must be a number.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = { title, status: edit.status || "lead", value: valueNum };

      const { data, error } = await sb.from("deals").update(payload).eq("id", dealId).select("*").single();
      if (error) throw error;

      setDeal(data);
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to save deal");
    } finally {
      setSaving(false);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    setErr("");

    const body = (noteBody || "").trim();
    if (!body) return setErr("Note can’t be empty.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = {
        user_id: session.user.id,
        contact_id: deal?.contact_id || null,
        deal_id: dealId,
        body,
      };

      const { data, error } = await sb.from("notes").insert([payload]).select("*").single();
      if (error) throw error;

      setNotes((p) => [data, ...p]);
      setNoteBody("");
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

      setNotes((p) => p.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete note");
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

      const payload = {
        user_id: session.user.id,
        contact_id: deal?.contact_id || null,
        deal_id: dealId,
        title,
        description: taskForm.description.trim() ? taskForm.description.trim() : null,
        due_at: dueIso,
        completed: false,
      };

      const { data, error } = await sb.from("tasks").insert([payload]).select("*").single();
      if (error) throw error;

      setTasks((p) => [data, ...p]);
      setTaskForm({ title: "", description: "", due_at: "" });
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
      setTasks((p) => p.map((t) => (t.id === task.id ? data : t)));
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

      setTasks((p) => p.filter((t) => t.id !== taskId));
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

      const payload = {
        user_id: session.user.id,
        contact_id: deal?.contact_id || null,
        deal_id: dealId,
        title,
        location: eventForm.location.trim() ? eventForm.location.trim() : null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        notes: eventForm.notes.trim() ? eventForm.notes.trim() : null,
      };

      const { data, error } = await sb.from("calendar_events").insert([payload]).select("*").single();
      if (error) throw error;

      setEvents((p) => {
        const next = [data, ...p];
        next.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
        return next;
      });

      setEventForm({ title: "", location: "", start_at: "", end_at: "", notes: "" });
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

      setEvents((p) => p.filter((x) => x.id !== eventId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete event");
    }
  }

  if (loading) return <div style={{ opacity: 0.75 }}>Loading…</div>;

  if (!deal) {
    return (
      <div>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Deal</h1>
            <p style={styles.sub}>
              Activity log • Realtime: <span style={styles.badge}>{rtStatus}</span>
            </p>
          </div>
          <button onClick={loadAll} style={styles.btnGhost}>
            Refresh
          </button>
        </div>

        {err ? <div style={styles.alert}>{err}</div> : null}
        <div style={{ marginTop: 18, opacity: 0.75 }}>Deal not found.</div>
      </div>
    );
  }

  const dealTitle = deal.title || "Untitled Deal";
  const contactName =
    contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Unnamed Contact" : "—";

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>{dealTitle}</h1>
          <p style={styles.sub}>
            Deal hub • Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            Contact:{" "}
            {deal.contact_id ? (
              <Link href={`/dashboard/contacts/${deal.contact_id}`} style={styles.link}>
                {contactName}
              </Link>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link href="/dashboard/deals" style={styles.linkBtn}>
            Back
          </Link>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Edit deal */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>Deal Details</h2>
        </div>

        <form onSubmit={saveDeal} style={styles.form}>
          <div style={styles.grid3}>
            <input value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} style={styles.input} />
            <select value={edit.status} onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))} style={styles.select}>
              <option value="lead">lead</option>
              <option value="active">active</option>
              <option value="under_contract">under_contract</option>
              <option value="closed">closed</option>
              <option value="lost">lost</option>
            </select>
            <input value={edit.value} onChange={(e) => setEdit((p) => ({ ...p, value: e.target.value }))} style={styles.input} placeholder="Value" />
          </div>

          <button type="submit" disabled={saving} style={styles.btnPrimary}>
            {saving ? "Saving..." : "Save Deal"}
          </button>
        </form>
      </div>

      {/* Notes */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>Notes ({notes.length})</h2>
        </div>

        <form onSubmit={addNote} style={styles.form}>
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write a note..." style={styles.textarea} rows={3} />
          <button type="submit" disabled={saving} style={styles.btnPrimary}>
            {saving ? "Saving..." : "Add Note"}
          </button>
        </form>

        {notes.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 10 }}>No notes yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {notes.map((n) => (
              <div key={n.id} style={styles.item}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.body}</div>
                <div style={styles.itemMeta}>
                  <div style={{ opacity: 0.75 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : "—"}</div>
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
          <h2 style={styles.h2}>Tasks ({tasks.length})</h2>
        </div>

        <form onSubmit={addTask} style={styles.form}>
          <input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} placeholder="Task title..." style={styles.input} />
          <textarea value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description (optional)..." style={styles.textarea} rows={2} />
          <input type="datetime-local" value={taskForm.due_at} onChange={(e) => setTaskForm((p) => ({ ...p, due_at: e.target.value }))} style={{ ...styles.input, colorScheme: "dark" }} />
          <button type="submit" disabled={saving} style={styles.btnPrimary}>
            {saving ? "Saving..." : "Add Task"}
          </button>
        </form>

        {tasks.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 10 }}>No tasks yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {tasks.map((t) => (
              <div key={t.id} style={styles.item}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <button onClick={() => toggleTask(t)} style={t.completed ? styles.chkOn : styles.chkOff} type="button" />
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 950, opacity: t.completed ? 0.55 : 1, textDecoration: t.completed ? "line-through" : "none" }}>
                        {t.title}
                      </div>
                      {t.description ? <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>{t.description}</div> : null}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(t.id)} style={styles.btnDanger} type="button">
                    Delete
                  </button>
                </div>

                <div style={styles.itemMeta}>
                  <div>
                    <span style={{ opacity: 0.75 }}>Due:</span>{" "}
                    <span style={{ fontWeight: 900 }}>{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</span>
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
          <h2 style={styles.h2}>Calendar ({events.length})</h2>
        </div>

        <form onSubmit={addEvent} style={styles.form}>
          <input value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} placeholder="Event title..." style={styles.input} />
          <input value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location (optional)..." style={styles.input} />
          <div style={styles.grid2}>
            <input type="datetime-local" value={eventForm.start_at} onChange={(e) => setEventForm((p) => ({ ...p, start_at: e.target.value }))} style={{ ...styles.input, colorScheme: "dark" }} />
            <input type="datetime-local" value={eventForm.end_at} onChange={(e) => setEventForm((p) => ({ ...p, end_at: e.target.value }))} style={{ ...styles.input, colorScheme: "dark" }} />
          </div>
          <textarea value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)..." style={styles.textarea} rows={2} />
          <button type="submit" disabled={saving} style={styles.btnPrimary}>
            {saving ? "Saving..." : "Add Event"}
          </button>
        </form>

        {events.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 10 }}>No events yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {events.map((ev) => (
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
                  <div style={{ opacity: 0.75 }}>Created: {ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"}</div>
                  <div style={{ opacity: 0.75 }}>Updated: {ev.updated_at ? new Date(ev.updated_at).toLocaleString() : "—"}</div>
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

  link: { color: "white", fontWeight: 950, textDecoration: "underline" },

  card: {
    marginTop: 14,
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
};
