"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ContactProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);

  // Contact
  const [contact, setContact] = useState(null);
  const [edit, setEdit] = useState({ name: "", email: "", phone: "", company: "", tags: "" });
  const [saving, setSaving] = useState(false);

  // Deals
  const [deals, setDeals] = useState([]);
  const [dealTitle, setDealTitle] = useState("");
  const [dealStage, setDealStage] = useState("Lead");
  const [dealValue, setDealValue] = useState("");

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  // Calendar
  const [events, setEvents] = useState([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: ds }, { data: ns }, { data: ts }, { data: es }] =
        await Promise.all([
          sb.from("contacts").select("*").eq("id", id).single(),
          sb.from("deals").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
          sb.from("notes").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
          sb.from("tasks").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
          sb.from("calendar_events")
            .select("*")
            .eq("contact_id", id)
            .order("starts_at", { ascending: true }),
        ]);

      setContact(c || null);
      setEdit({
        name: c?.name || "",
        email: c?.email || "",
        phone: c?.phone || "",
        company: c?.company || "",
        tags: c?.tags || "",
      });

      setDeals(Array.isArray(ds) ? ds : []);
      setNotes(Array.isArray(ns) ? ns : []);
      setTasks(Array.isArray(ts) ? ts : []);
      setEvents(Array.isArray(es) ? es : []);
    } catch (e) {
      console.error(e);
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
    loadAll();

    // Live updates for this contact only
    const channels = [
      sb
        .channel(`contact-${id}-contacts`)
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, (p) => {
          if (p?.new?.id === id || p?.old?.id === id) loadAll();
        })
        .subscribe(),

      sb
        .channel(`contact-${id}-deals`)
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (p) => {
          if (p?.new?.contact_id === id || p?.old?.contact_id === id) loadAll();
        })
        .subscribe(),

      sb
        .channel(`contact-${id}-notes`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (p) => {
          if (p?.new?.contact_id === id || p?.old?.contact_id === id) loadAll();
        })
        .subscribe(),

      sb
        .channel(`contact-${id}-tasks`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p) => {
          if (p?.new?.contact_id === id || p?.old?.contact_id === id) loadAll();
        })
        .subscribe(),

      sb
        .channel(`contact-${id}-events`)
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, (p) => {
          if (p?.new?.contact_id === id || p?.old?.contact_id === id) loadAll();
        })
        .subscribe(),
    ];

    return () => channels.forEach((ch) => sb.removeChannel(ch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveContact() {
    if (!contact?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: edit.name?.trim() || null,
        email: edit.email?.trim() || null,
        phone: edit.phone?.trim() || null,
        company: edit.company?.trim() || null,
        tags: edit.tags?.trim() || null,
      };
      await sb.from("contacts").update(payload).eq("id", contact.id);
    } catch (e) {
      console.error(e);
      alert("Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact() {
    if (!contact?.id) return;
    if (
      !confirm(
        "Delete this contact? This will also delete all related deals, notes, tasks, and calendar events."
      )
    )
      return;

    try {
      await sb.from("contacts").delete().eq("id", contact.id);
      router.push("/dashboard/contacts");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete contact");
    }
  }

  // DEALS
  async function addDeal(e) {
    e.preventDefault();
    const t = dealTitle.trim();
    if (!t) return;

    try {
      await sb.from("deals").insert({
        title: t,
        stage: dealStage,
        value: dealValue ? Number(dealValue) : null,
        contact_id: id,
      });

      setDealTitle("");
      setDealStage("Lead");
      setDealValue("");
    } catch (e) {
      console.error(e);
      alert("Failed to add deal");
    }
  }

  async function removeDeal(dealId) {
    if (!confirm("Delete this deal?")) return;
    try {
      await sb.from("deals").delete().eq("id", dealId);
    } catch (e) {
      console.error(e);
      alert("Failed to delete deal");
    }
  }

  // NOTES
  async function addNote(e) {
    e.preventDefault();
    const t = noteText.trim();
    if (!t) return;

    try {
      await sb.from("notes").insert({
        body: t,
        contact_id: id,
      });
      setNoteText("");
    } catch (e) {
      console.error(e);
      alert("Failed to add note");
    }
  }

  async function removeNote(noteId) {
    if (!confirm("Delete this note?")) return;
    try {
      await sb.from("notes").delete().eq("id", noteId);
    } catch (e) {
      console.error(e);
      alert("Failed to delete note");
    }
  }

  // TASKS
  async function addTask(e) {
    e.preventDefault();
    const t = taskTitle.trim();
    if (!t) return;

    try {
      await sb.from("tasks").insert({
        title: t,
        status: "open",
        due_at: taskDueAt || null,
        contact_id: id,
      });
      setTaskTitle("");
      setTaskDueAt("");
    } catch (e) {
      console.error(e);
      alert("Failed to add task");
    }
  }

  async function toggleTask(task) {
    try {
      await sb
        .from("tasks")
        .update({ status: task.status === "done" ? "open" : "done" })
        .eq("id", task.id);
    } catch (e) {
      console.error(e);
      alert("Failed to update task");
    }
  }

  async function removeTask(taskId) {
    if (!confirm("Delete this task?")) return;
    try {
      await sb.from("tasks").delete().eq("id", taskId);
    } catch (e) {
      console.error(e);
      alert("Failed to delete task");
    }
  }

  // EVENTS
  async function addEvent(e) {
    e.preventDefault();
    const t = eventTitle.trim();
    if (!t) return;
    if (!eventStartsAt) return alert("Pick a start time");

    try {
      await sb.from("calendar_events").insert({
        title: t,
        starts_at: eventStartsAt,
        ends_at: eventEndsAt || null,
        contact_id: id,
      });

      setEventTitle("");
      setEventStartsAt("");
      setEventEndsAt("");
    } catch (e) {
      console.error(e);
      alert("Failed to add event");
    }
  }

  async function removeEvent(eventId) {
    if (!confirm("Delete this event?")) return;
    try {
      await sb.from("calendar_events").delete().eq("id", eventId);
    } catch (e) {
      console.error(e);
      alert("Failed to delete event");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Client Profile</h1>
          <div style={styles.sub}>All info for this contact in one place.</div>
        </div>

        <div style={styles.headerBtns}>
          <Link href="/dashboard/contacts" style={styles.btnGhost}>
            ← Back to Contacts
          </Link>
          <button onClick={loadAll} style={styles.btn}>
            Refresh
          </button>
          <button onClick={deleteContact} style={styles.btnDanger}>
            Delete Contact
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.card}>
          <div style={styles.muted}>Loading…</div>
        </div>
      ) : !contact ? (
        <div style={styles.card}>
          <div style={styles.muted}>Contact not found.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {/* LEFT: CONTACT CARD */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Contact</div>

            <div style={styles.form}>
              <label style={styles.label}>
                <div style={styles.labelText}>Name</div>
                <input
                  style={styles.input}
                  value={edit.name}
                  onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                />
              </label>

              <label style={styles.label}>
                <div style={styles.labelText}>Email</div>
                <input
                  style={styles.input}
                  value={edit.email}
                  onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </label>

              <label style={styles.label}>
                <div style={styles.labelText}>Phone</div>
                <input
                  style={styles.input}
                  value={edit.phone}
                  onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(###) ###-####"
                />
              </label>

              <label style={styles.label}>
                <div style={styles.labelText}>Company</div>
                <input
                  style={styles.input}
                  value={edit.company}
                  onChange={(e) => setEdit((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Optional"
                />
              </label>

              <label style={styles.label}>
                <div style={styles.labelText}>Tags</div>
                <input
                  style={styles.input}
                  value={edit.tags}
                  onChange={(e) => setEdit((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="buyer, seller, investor..."
                />
              </label>

              <button onClick={saveContact} style={styles.primary} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>

              <div style={styles.stats}>
                <Stat label="Deals" value={deals.length} />
                <Stat label="Notes" value={notes.length} />
                <Stat label="Tasks" value={tasks.length} />
                <Stat label="Events" value={events.length} />
              </div>
            </div>
          </div>

          {/* RIGHT: SECTIONS */}
          <div style={styles.stack}>
            {/* DEALS */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>Deals</div>
              </div>

              <form onSubmit={addDeal} style={styles.inlineForm}>
                <input
                  style={styles.input}
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Deal title (e.g. 123 Main St purchase)"
                />
                <select style={styles.select} value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
                  <option>Lead</option>
                  <option>Active</option>
                  <option>Under Contract</option>
                  <option>Closed</option>
                  <option>Lost</option>
                </select>
                <input
                  style={styles.input}
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="Value (optional)"
                  inputMode="numeric"
                />
                <button style={styles.primary} type="submit">
                  Add
                </button>
              </form>

              <div style={styles.list}>
                {deals.length === 0 ? (
                  <div style={styles.muted}>No deals yet.</div>
                ) : (
                  deals.map((d) => (
                    <div key={d.id} style={styles.item}>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.itemTitle}>{d.title}</div>
                        <div style={styles.meta}>
                          <span>Stage: {d.stage || "—"}</span>
                          {d.value ? <span>• Value: {d.value}</span> : null}
                        </div>
                      </div>
                      <button onClick={() => removeDeal(d.id)} style={styles.smallDanger} type="button">
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NOTES */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Notes</div>

              <form onSubmit={addNote} style={styles.noteForm}>
                <textarea
                  style={styles.textarea}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note (conversation summary, requirements, next steps...)"
                />
                <button style={styles.primary} type="submit">
                  Add Note
                </button>
              </form>

              <div style={styles.list}>
                {notes.length === 0 ? (
                  <div style={styles.muted}>No notes yet.</div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} style={styles.item}>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.itemBody}>{n.body || n.text || ""}</div>
                        <div style={styles.meta}>
                          {n.created_at ? <span>{new Date(n.created_at).toLocaleString()}</span> : null}
                        </div>
                      </div>
                      <button onClick={() => removeNote(n.id)} style={styles.smallDanger} type="button">
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TASKS */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Tasks</div>

              <form onSubmit={addTask} style={styles.inlineForm}>
                <input
                  style={styles.input}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task (follow up, schedule showing...)"
                />
                <input
                  style={styles.input}
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                  type="datetime-local"
                />
                <button style={styles.primary} type="submit">
                  Add
                </button>
              </form>

              <div style={styles.list}>
                {tasks.length === 0 ? (
                  <div style={styles.muted}>No tasks yet.</div>
                ) : (
                  tasks.map((t) => {
                    const due = t.due_at ? new Date(t.due_at).toLocaleString() : "";
                    const done = t.status === "done";
                    return (
                      <div key={t.id} style={styles.item}>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.itemTop}>
                            <button
                              onClick={() => toggleTask(t)}
                              style={{ ...styles.pill, ...(done ? styles.pillDone : styles.pillOpen) }}
                              type="button"
                            >
                              {done ? "Done" : "Open"}
                            </button>
                            <div style={styles.itemTitle}>{t.title}</div>
                          </div>
                          <div style={styles.meta}>
                            {due ? <span>Due: {due}</span> : <span style={styles.dim}>No due date</span>}
                          </div>
                        </div>
                        <button onClick={() => removeTask(t.id)} style={styles.smallDanger} type="button">
                          Delete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CALENDAR */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Calendar</div>

              <form onSubmit={addEvent} style={styles.inlineForm}>
                <input
                  style={styles.input}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event title (inspection, showing...)"
                />
                <input
                  style={styles.input}
                  value={eventStartsAt}
                  onChange={(e) => setEventStartsAt(e.target.value)}
                  type="datetime-local"
                />
                <input
                  style={styles.input}
                  value={eventEndsAt}
                  onChange={(e) => setEventEndsAt(e.target.value)}
                  type="datetime-local"
                />
                <button style={styles.primary} type="submit">
                  Add
                </button>
              </form>

              <div style={styles.list}>
                {events.length === 0 ? (
                  <div style={styles.muted}>No events yet.</div>
                ) : (
                  events.map((ev) => {
                    const s = ev.starts_at ? new Date(ev.starts_at).toLocaleString() : "";
                    const e = ev.ends_at ? new Date(ev.ends_at).toLocaleString() : "";
                    return (
                      <div key={ev.id} style={styles.item}>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.itemTitle}>{ev.title}</div>
                          <div style={styles.meta}>
                            {s ? <span>Start: {s}</span> : null}
                            {e ? <span>• End: {e}</span> : null}
                          </div>
                        </div>
                        <button onClick={() => removeEvent(ev.id)} style={styles.smallDanger} type="button">
                          Delete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
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
    flexWrap: "wrap",
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
  btnDanger: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    fontWeight: 950,
    cursor: "pointer",
  },

  grid: { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 },
  stack: { display: "grid", gap: 14 },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontWeight: 950, marginBottom: 10 },

  form: { display: "grid", gap: 10 },
  label: { display: "grid", gap: 6 },
  labelText: { fontSize: 12, opacity: 0.75, fontWeight: 900 },

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
  textarea: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 800,
    minHeight: 90,
    resize: "vertical",
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

  inlineForm: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr 1fr auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  noteForm: { display: "grid", gap: 10, marginBottom: 12 },

  list: { display: "grid", gap: 10 },
  muted: { opacity: 0.7, fontWeight: 800, padding: 10 },

  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
  },
  itemTop: { display: "flex", alignItems: "center", gap: 10 },
  itemTitle: { fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemBody: { fontWeight: 850, opacity: 0.95, whiteSpace: "pre-wrap" },
  meta: { marginTop: 6, fontSize: 12, opacity: 0.75, display: "flex", gap: 8, flexWrap: "wrap" },
  dim: { opacity: 0.65 },

  pill: {
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 950,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    cursor: "pointer",
    flexShrink: 0,
  },
  pillOpen: { background: "rgba(255,255,255,0.08)", color: "white" },
  pillDone: { background: "rgba(34,197,94,0.18)", color: "white", border: "1px solid rgba(34,197,94,0.35)" },

  smallDanger: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    fontWeight: 950,
    cursor: "pointer",
    flexShrink: 0,
  },

  stats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 10 },
  stat: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.20)",
    padding: 10,
  },
  statLabel: { fontSize: 12, opacity: 0.7, fontWeight: 900 },
  statValue: { fontSize: 22, fontWeight: 950, marginTop: 6 },
};
