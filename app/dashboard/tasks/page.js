"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function TasksPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");

  async function getUserId() {
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    if (!data?.user?.id) throw new Error("Not logged in");
    return data.user.id;
  }

  async function run(promise, label) {
    const { data, error } = await promise;
    if (error) {
      console.error(label, error);
      alert(`${label}: ${error.message}`);
      return { ok: false, data: null };
    }
    return { ok: true, data };
  }

  async function load() {
    setLoading(true);
    try {
      const user_id = await getUserId();
      const res = await run(
        sb.from("tasks").select("*").eq("user_id", user_id).order("created_at", { ascending: false }),
        "Load tasks failed"
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      alert(`Load tasks crashed: ${e.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTask(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const user_id = await getUserId();

    const res = await run(
      sb.from("tasks").insert({
        user_id,
        title: t,
        status: "open",
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        contact_id: contactId.trim() ? contactId.trim() : null,
      }),
      "Add task failed"
    );

    if (res.ok) {
      setTitle("");
      setDueAt("");
      setContactId("");
      await load();
    }
  }

  async function toggle(t) {
    const res = await run(
      sb.from("tasks").update({ status: t.status === "done" ? "open" : "done" }).eq("id", t.id),
      "Update task failed"
    );
    if (res.ok) await load();
  }

  async function remove(id) {
    const res = await run(sb.from("tasks").delete().eq("id", id), "Delete task failed");
    if (res.ok) await load();
  }

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ margin: 0, fontSize: 34 }}>Tasks</h1>
      <div style={{ opacity: 0.7, fontWeight: 800, marginTop: 6 }}>Reminders + follow-ups.</div>

      <div style={card}>
        <form onSubmit={addTask} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 10 }}>
          <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          <input style={input} type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <input style={input} value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contact_id (optional)" />
          <button style={primary} type="submit">Add</button>
        </form>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ opacity: 0.7, fontWeight: 800 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontWeight: 800 }}>No tasks yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((t) => (
              <div key={t.id} style={item}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button type="button" onClick={() => toggle(t)} style={pill}>
                      {t.status === "done" ? "Done" : "Open"}
                    </button>
                    <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{t.due_at ? `Due: ${new Date(t.due_at).toLocaleString()}` : "No due date"}</span>
                    {t.contact_id ? <span>• Contact: {t.contact_id}</span> : null}
                  </div>
                </div>

                <button type="button" onClick={() => remove(t.id)} style={danger}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const card = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", padding: 14, marginTop: 14 };
const input = { padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.25)", color: "white", outline: "none", fontWeight: 800 };
const primary = { padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "white", color: "black", fontWeight: 950, cursor: "pointer" };
const item = { display: "flex", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)" };
const pill = { borderRadius: 999, padding: "6px 10px", fontWeight: 950, fontSize: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer" };
const danger = { borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)", color: "#fecaca", fontWeight: 950, cursor: "pointer" };
