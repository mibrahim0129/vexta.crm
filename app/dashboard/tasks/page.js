"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function TasksPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);

  const [filter, setFilter] = useState("open"); // open | done | all
  const [search, setSearch] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: tasksData }, { data: contactsData }, { data: dealsData }] =
        await Promise.all([
          sb.from("tasks").select("*").order("created_at", { ascending: false }),
          sb.from("contacts").select("id, name").order("name", { ascending: true }),
          sb.from("deals").select("id, title, contact_id").order("created_at", { ascending: false }),
        ]);

      setRows(Array.isArray(tasksData) ? tasksData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

    const channel = sb
      .channel("tasks-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => loadAll()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTask(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    try {
      await sb.from("tasks").insert({
        title: t,
        status: "open",
        due_at: dueAt || null,
        contact_id: contactId || null,
        deal_id: dealId || null,
      });

      setTitle("");
      setDueAt("");
      setContactId("");
      setDealId("");
      // realtime will refresh
    } catch (e) {
      console.error(e);
      alert("Failed to add task");
    }
  }

  async function toggleDone(task) {
    try {
      const next = task.status === "done" ? "open" : "done";
      await sb.from("tasks").update({ status: next }).eq("id", task.id);
    } catch (e) {
      console.error(e);
      alert("Failed to update task");
    }
  }

  async function removeTask(id) {
    if (!confirm("Delete this task?")) return;
    try {
      await sb.from("tasks").delete().eq("id", id);
    } catch (e) {
      console.error(e);
      alert("Failed to delete task");
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
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => {
        if (!s) return true;
        const contactName = contactNameById.get(r.contact_id) || "";
        const dealTitle = dealTitleById.get(r.deal_id) || "";
        return (
          (r.title || "").toLowerCase().includes(s) ||
          contactName.toLowerCase().includes(s) ||
          dealTitle.toLowerCase().includes(s)
        );
      });
  }, [rows, filter, search, contactNameById, dealTitleById]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Tasks</h1>
          <div style={styles.sub}>Reminders & to-dos tied to contacts and deals.</div>
        </div>

        <div style={styles.headerBtns}>
          <button onClick={loadAll} style={styles.btn}>
            Refresh
          </button>
          <Link href="/dashboard/calendar" style={styles.btnGhost}>
            Calendar
          </Link>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Add task</div>

          <form onSubmit={addTask} style={styles.form}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Task title (call client, send docs, follow up...)"
            />

            <div style={styles.row2}>
              <input
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                style={styles.input}
                type="datetime-local"
              />
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
            </div>

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

            <button style={styles.primary} type="submit">
              Add Task
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <div style={styles.controls}>
            <div style={styles.tabs}>
              {["open", "done", "all"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    ...styles.tab,
                    ...(filter === t ? styles.tabActive : {}),
                  }}
                  type="button"
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.search}
              placeholder="Search tasks..."
            />
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.muted}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={styles.muted}>No tasks found.</div>
            ) : (
              filtered.map((t) => {
                const contactName = contactNameById.get(t.contact_id);
                const dealTitle = dealTitleById.get(t.deal_id);
                const due = t.due_at ? new Date(t.due_at).toLocaleString() : "";

                return (
                  <div key={t.id} style={styles.item}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.itemTop}>
                        <button
                          type="button"
                          onClick={() => toggleDone(t)}
                          style={{
                            ...styles.pill,
                            ...(t.status === "done" ? styles.pillDone : styles.pillOpen),
                          }}
                        >
                          {t.status === "done" ? "Done" : "Open"}
                        </button>
                        <div style={styles.title}>{t.title}</div>
                      </div>

                      <div style={styles.meta}>
                        {due ? <span>Due: {due}</span> : <span style={styles.dim}>No due date</span>}
                        {contactName ? <span>• Contact: {contactName}</span> : null}
                        {dealTitle ? <span>• Deal: {dealTitle}</span> : null}
                      </div>
                    </div>

                    <button type="button" onClick={() => removeTask(t.id)} style={styles.trash}>
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
  search: {
    marginLeft: "auto",
    minWidth: 240,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },

  list: { marginTop: 12, display: "grid", gap: 10 },
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
  title: { fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { marginTop: 6, fontSize: 12, opacity: 0.75, display: "flex", gap: 8, flexWrap: "wrap" },
  dim: { opacity: 0.65 },

  pill: {
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 950,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    cursor: "pointer",
  },
  pillOpen: { background: "rgba(255,255,255,0.08)", color: "white" },
  pillDone: { background: "rgba(34,197,94,0.18)", color: "white", border: "1px solid rgba(34,197,94,0.35)" },

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
