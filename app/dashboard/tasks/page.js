"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

function getDueBadge(dueAtIso, completed) {
  if (completed) return { text: "Completed", tone: "muted" };
  if (!dueAtIso) return { text: "No due date", tone: "muted" };

  const now = Date.now();
  const due = new Date(dueAtIso).getTime();
  const diff = due - now;

  if (diff < 0) return { text: "Overdue", tone: "danger" };
  if (diff <= 1000 * 60 * 60 * 24) return { text: "Due soon", tone: "warn" };
  return { text: "Later", tone: "ok" };
}

export default function TasksPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [filter, setFilter] = useState("open"); // open | completed | all

  const [form, setForm] = useState({
    contact_id: "",
    deal_id: "",
    title: "",
    description: "",
    due_at: "",
  });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/tasks";
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

  async function loadTasks() {
    const session = await requireSession();
    if (!session) return;

    setErr("");
    setLoading(true);

    try {
      let q = sb
        .from("tasks")
        .select(
          `
          id, title, description, due_at, completed, created_at,
          contact_id, deal_id,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .order("completed", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filter === "open") q = q.eq("completed", false);
      if (filter === "completed") q = q.eq("completed", true);

      const { data, error } = await q;
      if (error) throw error;

      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load tasks");
      setTasks([]);
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
      await loadTasks();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    setErr("");

    const title = form.title.trim();
    if (!title) return setErr("Task title is required.");

    const session = await requireSession();
    if (!session) return;

    try {
      const dueAtIso = form.due_at ? new Date(form.due_at).toISOString() : null;

      const { data, error } = await sb
        .from("tasks")
        .insert([
          {
            user_id: session.user.id,
            contact_id: form.contact_id || null,
            deal_id: form.deal_id || null,
            title,
            description: form.description.trim() || null,
            due_at: dueAtIso,
          },
        ])
        .select(
          `
          id, title, description, due_at, completed, created_at,
          contact_id, deal_id,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .single();

      if (error) throw error;

      setTasks((p) => [data, ...p]);
      setForm((p) => ({ ...p, title: "", description: "", due_at: "" }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add task");
    }
  }

  async function toggleComplete(taskId, completed) {
    setErr("");
    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("tasks").update({ completed }).eq("id", taskId);
      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
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

      const channel = sb.channel("tasks-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          if (mountedRef.current) loadTasks();
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
          <h1 style={styles.h1}>Tasks</h1>
          <div style={styles.sub}>
            Realtime: <span style={styles.badge}>{rtStatus}</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.pills}>
            <button onClick={() => setFilter("open")} style={{ ...styles.pill, ...(filter === "open" ? styles.pillOn : {}) }}>
              Open
            </button>
            <button onClick={() => setFilter("completed")} style={{ ...styles.pill, ...(filter === "completed" ? styles.pillOn : {}) }}>
              Completed
            </button>
            <button onClick={() => setFilter("all")} style={{ ...styles.pill, ...(filter === "all" ? styles.pillOn : {}) }}>
              All
            </button>
          </div>

          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Task</h2>

        <form onSubmit={addTask} style={styles.form}>
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
            placeholder="Task title (ex: Follow up with buyer)"
            style={styles.input}
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            style={styles.textarea}
            rows={3}
          />

          <div style={styles.grid2}>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm((p) => ({ ...p, due_at: e.target.value }))}
              style={styles.input}
            />
            <button type="submit" style={styles.btnPrimary} disabled={contacts.length === 0}>
              Add Task
            </button>
          </div>

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
          Tasks {loading ? "(loading…)" : `(${tasks.length})`}
        </h2>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No tasks yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {tasks.map((t) => {
              const c = t.contacts;
              const d = t.deals;

              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "No contact";

              const dueText = t.due_at ? new Date(t.due_at).toLocaleString() : "No due date";
              const badge = getDueBadge(t.due_at, t.completed);

              return (
                <div key={t.id} style={styles.item}>
                  <div style={styles.itemTop}>
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 950, textDecoration: t.completed ? "line-through" : "none" }}>
                          {t.title}
                        </div>
                        <span
                          style={{
                            ...styles.duePill,
                            ...(badge.tone === "danger" ? styles.dueDanger : {}),
                            ...(badge.tone === "warn" ? styles.dueWarn : {}),
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>

                      <div style={styles.meta}>
                        Contact:{" "}
                        {t.contact_id ? (
                          <Link href={`/dashboard/contacts/${t.contact_id}`} style={styles.link}>
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
                        {" "}
                        • Due: <b>{dueText}</b>
                      </div>

                      {t.description ? <div style={{ opacity: 0.8, fontSize: 13 }}>{t.description}</div> : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        onClick={() => toggleComplete(t.id, !t.completed)}
                        style={t.completed ? styles.btnGhost : styles.btnPrimarySmall}
                      >
                        {t.completed ? "Reopen" : "Complete"}
                      </button>
                      <button onClick={() => deleteTask(t.id)} style={styles.btnDanger}>
                        Delete
                      </button>
                    </div>
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
  pills: { display: "flex", gap: 8, alignItems: "center" },
  pill: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    opacity: 0.85,
  },
  pillOn: { background: "rgba(255,255,255,0.10)", opacity: 1 },

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
    fontSize: 13,
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

  duePill: {
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 950,
    opacity: 0.9,
  },
  dueDanger: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.12)",
    color: "#fecaca",
    opacity: 1,
  },
  dueWarn: {
    border: "1px solid rgba(245,158,11,0.35)",
    background: "rgba(245,158,11,0.10)",
    color: "#fde68a",
    opacity: 1,
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