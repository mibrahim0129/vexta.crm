"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Soft gating
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

export default function TasksPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Beta Mode toggle (no helpers)
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();

  // ✅ In beta: everything is enabled
  const canWrite = isBeta ? true : !subLoading && !!access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState("open"); // open | all | completed
  const [filterContactId, setFilterContactId] = useState("all");
  const [filterDealId, setFilterDealId] = useState("all");
  const [filterDue, setFilterDue] = useState("all"); // all | today | overdue | next7

  // Form
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

  function isoFromLocalDatetime(v) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  function startOfTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  function endOfTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  function endOfNext7Local() {
    const start = startOfTodayLocal();
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  function isOverdue(dueAtIso, completed) {
    if (completed) return false;
    if (!dueAtIso) return false;
    const due = new Date(dueAtIso);
    if (Number.isNaN(due.getTime())) return false;
    return due.getTime() < new Date().getTime();
  }

  function isToday(dueAtIso) {
    if (!dueAtIso) return false;
    const due = new Date(dueAtIso);
    if (Number.isNaN(due.getTime())) return false;
    const start = startOfTodayLocal().getTime();
    const end = endOfTodayLocal().getTime();
    return due.getTime() >= start && due.getTime() <= end;
  }

  function isWithinNext7Days(dueAtIso, completed) {
    if (completed) return false;
    if (!dueAtIso) return false;
    const due = new Date(dueAtIso);
    if (Number.isNaN(due.getTime())) return false;
    const start = new Date().getTime();
    const end = endOfNext7Local().getTime();
    return due.getTime() >= start && due.getTime() <= end;
  }

  function contactNameById(id) {
    const c = contacts.find((x) => x.id === id);
    const name = `${c?.first_name || ""} ${c?.last_name || ""}`.trim();
    return name || "Unnamed";
  }

  function dealTitleById(id) {
    const d = deals.find((x) => x.id === id);
    return d?.title || "—";
  }

  function sortByDueThenCreated(list) {
    const next = [...list];
    next.sort((a, b) => {
      const ad = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return next;
  }

  function requireWriteOrWarn(message) {
    // ✅ Beta: always allow
    if (isBeta) return true;

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

  async function loadDeals() {
    const { data, error } = await sb
      .from("deals")
      .select("id, title, contact_id, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setDeals(Array.isArray(data) ? data : []);
  }

  async function loadTasks() {
    const session = await requireSession();
    if (!session) return;

    setErr("");
    setLoading(true);

    try {
      const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: false });
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

      await Promise.all([loadContacts(), loadDeals(), loadTasks()]);
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

    if (!requireWriteOrWarn("Upgrade required to add tasks.")) return;

    const title = (form.title || "").trim();
    if (!title) return setErr("Task title can’t be empty.");
    if (!form.contact_id) return setErr("Please select a contact.");

    const dueIso = isoFromLocalDatetime(form.due_at);

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = {
        user_id: session.user.id,
        contact_id: form.contact_id,
        deal_id: form.deal_id ? form.deal_id : null,
        title,
        description: form.description.trim() ? form.description.trim() : null,
        due_at: dueIso,
        completed: false,
      };

      const { data, error } = await sb.from("tasks").insert([payload]).select("*").single();
      if (error) throw error;

      setTasks((prev) => [data, ...prev]);
      setForm((p) => ({ ...p, title: "", description: "", due_at: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add task");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(t) {
    setErr("");

    if (!requireWriteOrWarn("Upgrade required to complete tasks.")) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { data, error } = await sb
        .from("tasks")
        .update({ completed: !t.completed })
        .eq("id", t.id)
        .select("*")
        .single();

      if (error) throw error;
      setTasks((prev) => prev.map((x) => (x.id === t.id ? data : x)));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update task");
    }
  }

  async function deleteTask(id) {
    setErr("");

    if (!requireWriteOrWarn("Upgrade required to delete tasks.")) return;

    const ok = confirm("Delete this task?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("tasks").delete().eq("id", id);
      if (error) throw error;

      setTasks((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete task");
    }
  }

  // Keep deal filter valid when contact filter changes
  useEffect(() => {
    if (filterDealId === "all") return;
    if (filterContactId === "all") return;

    const d = deals.find((x) => x.id === filterDealId);
    if (d && d.contact_id !== filterContactId) {
      setFilterDealId("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterContactId, deals]);

  // Keep "Add Task" deal dropdown valid when form contact changes
  useEffect(() => {
    if (!form.contact_id) return;
    if (form.deal_id) {
      const d = deals.find((x) => x.id === form.deal_id);
      if (d && d.contact_id !== form.contact_id) setForm((p) => ({ ...p, deal_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_id, deals]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      const channel = sb.channel("tasks-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          if (mountedRef.current) loadTasks();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadContacts();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadDeals();
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = tasks
    .filter((t) => {
      if (filterStatus === "open" && t.completed) return false;
      if (filterStatus === "completed" && !t.completed) return false;

      if (filterContactId !== "all" && t.contact_id !== filterContactId) return false;
      if (filterDealId !== "all" && t.deal_id !== filterDealId) return false;

      if (filterDue === "today" && !isToday(t.due_at)) return false;
      if (filterDue === "overdue" && !isOverdue(t.due_at, t.completed)) return false;
      if (filterDue === "next7" && !isWithinNext7Days(t.due_at, t.completed)) return false;

      return true;
    })
    .sort((a, b) => {
      const ad = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

  // Buckets
  const overdue = sortByDueThenCreated(filteredTasks.filter((t) => isOverdue(t.due_at, t.completed)));
  const dueToday = sortByDueThenCreated(filteredTasks.filter((t) => !t.completed && isToday(t.due_at)));
  const next7 = sortByDueThenCreated(
    filteredTasks.filter((t) => isWithinNext7Days(t.due_at, t.completed) && !isToday(t.due_at))
  );
  const noDue = sortByDueThenCreated(filteredTasks.filter((t) => !t.completed && !t.due_at));
  const completed = sortByDueThenCreated(filteredTasks.filter((t) => t.completed));

  const hasContacts = contacts.length > 0;
  const canCreate = hasContacts && canWrite;

  function TaskRow({ t }) {
    const overdueFlag = isOverdue(t.due_at, t.completed);
    const todayFlag = !overdueFlag && isToday(t.due_at);

    // ✅ In beta: never disable writes because of subscription
    const disableWrites = isBeta ? false : !canWrite || subLoading;

    return (
      <div key={t.id} style={styles.item}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button
              onClick={() => toggleTask(t)}
              style={{
                ...(t.completed ? styles.chkOn : styles.chkOff),
                ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
              }}
              title={
                isBeta
                  ? t.completed
                    ? "Mark as open"
                    : "Mark as done"
                  : subLoading
                  ? "Checking plan…"
                  : !canWrite
                  ? "Upgrade required"
                  : t.completed
                  ? "Mark as open"
                  : "Mark as done"
              }
              type="button"
              disabled={disableWrites}
            />
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13, opacity: 0.95 }}>
                <div>
                  <span style={{ opacity: 0.75 }}>Contact:</span>{" "}
                  {t.contact_id ? (
                    <Link href={`/dashboard/contacts/${t.contact_id}`} style={styles.link}>
                      {contactNameById(t.contact_id)}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                </div>

                <div>
                  <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                  <span style={{ fontWeight: 900 }}>{t.deal_id ? dealTitleById(t.deal_id) : "—"}</span>
                </div>

                <div>
                  <span style={{ opacity: 0.75 }}>Due:</span>{" "}
                  <span style={{ fontWeight: 900 }}>{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</span>
                  {overdueFlag ? <span style={styles.badgeRed}> Overdue</span> : null}
                  {todayFlag ? <span style={styles.badgeBlue}> Today</span> : null}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => deleteTask(t.id)}
            style={{
              ...styles.btnDanger,
              ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
            }}
            type="button"
            disabled={disableWrites}
            title={
              isBeta ? "Delete task" : subLoading ? "Checking plan…" : !canWrite ? "Upgrade required" : "Delete task"
            }
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  function Bucket({ title, count, children }) {
    return (
      <div style={styles.bucket}>
        <div style={styles.bucketHeader}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>{count}</div>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>{children}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Tasks</h1>
          <p style={styles.sub}>
            Daily to-dos • Realtime: <span style={styles.badge}>{rtStatus}</span>{" "}
            <span style={{ opacity: 0.85 }}>
              {isBeta ? " • Beta Mode (all features unlocked)" : subLoading ? " • Checking plan…" : ` • Plan: ${plan || "Free"}`}
            </span>
          </p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ Upgrade banner (disabled in beta) */}
      {!isBeta && !subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to use tasks"
            body="You can view tasks, but creating, completing, and deleting tasks requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Add Task */}
      <div style={styles.card}>
        <h2 style={styles.h2}>Add Task</h2>

        <form onSubmit={addTask} style={styles.form}>
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
                contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"}
                  </option>
                ))
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
            placeholder="Task title..."
            style={styles.input}
            disabled={!canCreate || saving}
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)..."
            style={styles.textarea}
            rows={2}
            disabled={!canCreate || saving}
          />

          <input
            type="datetime-local"
            value={form.due_at}
            onChange={(e) => setForm((p) => ({ ...p, due_at: e.target.value }))}
            style={{ ...styles.input, colorScheme: "dark" }}
            disabled={!canCreate || saving}
          />

          <button
            type="submit"
            disabled={!canCreate || saving}
            style={{
              ...styles.btnPrimary,
              ...(!canWrite || subLoading
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
            {isBeta ? (saving ? "Saving..." : "Add Task") : subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Task"}
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

          {/* Beta: no upgrade warning */}
          {!isBeta && hasContacts && !subLoading && !access ? (
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Creating/completing/deleting tasks is disabled until you upgrade.
            </div>
          ) : null}
        </form>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>View {loading ? "(loading...)" : `(${filteredTasks.length})`}</h2>
        </div>

        <div style={styles.filters}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectSmall}>
            <option value="open">Open</option>
            <option value="all">All</option>
            <option value="completed">Completed</option>
          </select>

          <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} style={styles.selectSmall}>
            <option value="all">All due dates</option>
            <option value="today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="next7">Next 7 days</option>
          </select>

          <select
            value={filterContactId}
            onChange={(e) => setFilterContactId(e.target.value)}
            style={styles.selectSmall}
          >
            <option value="all">All contacts</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"}
              </option>
            ))}
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

      {/* Buckets */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No tasks match your filters.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {overdue.length > 0 ? (
              <Bucket title="Overdue" count={overdue.length}>
                {overdue.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </Bucket>
            ) : null}

            {dueToday.length > 0 ? (
              <Bucket title="Due Today" count={dueToday.length}>
                {dueToday.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </Bucket>
            ) : null}

            {next7.length > 0 ? (
              <Bucket title="Next 7 Days" count={next7.length}>
                {next7.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </Bucket>
            ) : null}

            {noDue.length > 0 ? (
              <Bucket title="No Due Date" count={noDue.length}>
                {noDue.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </Bucket>
            ) : null}

            {filterStatus !== "open" && completed.length > 0 ? (
              <Bucket title="Completed" count={completed.length}>
                {completed.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </Bucket>
            ) : null}

            {filterStatus === "open" &&
            overdue.length === 0 &&
            dueToday.length === 0 &&
            next7.length === 0 &&
            noDue.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No open tasks match your filters.</div>
            ) : null}
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

  badgeRed: {
    marginLeft: 8,
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    fontWeight: 950,
    fontSize: 12,
  },

  badgeBlue: {
    marginLeft: 8,
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.10)",
    color: "#bfdbfe",
    fontWeight: 950,
    fontSize: 12,
  },

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  card: {
    marginTop: 14,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

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
  },

  bucket: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
  },

  bucketHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottom: "1px solid #242424",
  },

  item: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 10,
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
