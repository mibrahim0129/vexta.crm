"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function CalendarPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
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
        sb.from("calendar_events").select("*").eq("user_id", user_id).order("starts_at", { ascending: true }),
        "Load events failed"
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      alert(`Load events crashed: ${e.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEvent(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (!startsAt) return alert("Pick a start time");

    const user_id = await getUserId();

    const res = await run(
      sb.from("calendar_events").insert({
        user_id,
        title: t,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        contact_id: contactId.trim() ? contactId.trim() : null,
      }),
      "Add event failed"
    );

    if (res.ok) {
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setContactId("");
      await load();
    }
  }

  async function remove(id) {
    const res = await run(sb.from("calendar_events").delete().eq("id", id), "Delete event failed");
    if (res.ok) await load();
  }

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ margin: 0, fontSize: 34 }}>Calendar</h1>
      <div style={{ opacity: 0.7, fontWeight: 800, marginTop: 6 }}>Appointments + reminders.</div>

      <div style={card}>
        <form onSubmit={addEvent} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto", gap: 10 }}>
          <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
          <input style={input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input style={input} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <input style={input} value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contact_id (optional)" />
          <button style={primary} type="submit">Add</button>
        </form>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ opacity: 0.7, fontWeight: 800 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontWeight: 800 }}>No events yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((ev) => (
              <div key={ev.id} style={item}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 950 }}>{ev.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>Start: {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : ""}</span>
                    {ev.ends_at ? <span>• End: {new Date(ev.ends_at).toLocaleString()}</span> : null}
                    {ev.contact_id ? <span>• Contact: {ev.contact_id}</span> : null}
                  </div>
                </div>

                <button type="button" onClick={() => remove(ev.id)} style={danger}>Delete</button>
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
const danger = { borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)", color: "#fecaca", fontWeight: 950, cursor: "pointer" };
