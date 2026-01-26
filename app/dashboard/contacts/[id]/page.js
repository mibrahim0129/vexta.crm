"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function ContactProfilePage() {
  const params = useParams();
  const contactId = params?.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [contact, setContact] = useState(null);
  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);

  // Add task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  // Add event
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  const taskDueIso = useMemo(() => {
    if (!taskDueAt) return null;
    const d = new Date(taskDueAt);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [taskDueAt]);

  const eventStartIso = useMemo(() => {
    if (!eventStart) return null;
    const d = new Date(eventStart);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [eventStart]);

  const eventEndIso = useMemo(() => {
    if (!eventEnd) return null;
    const d = new Date(eventEnd);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [eventEnd]);

  async function loadAll() {
    if (!contactId) return;

    setLoading(true);
    setErrorMsg(null);

    const [cRes, dRes, nRes, tRes, eRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).single(),
      supabase.from("deals").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").eq("contact_id", contactId).order("start_at", { ascending: true }),
    ]);

    console.log("loadAll", { cRes, dRes, nRes, tRes, eRes });

    if (cRes.error) {
      setErrorMsg(cRes.error.message);
      setContact(null);
      setDeals([]);
      setNotes([]);
      setTasks([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const err = dRes.error?.message || nRes.error?.message || tRes.error?.message || eRes.error?.message || null;
    setErrorMsg(err);

    setContact(cRes.data || null);
    setDeals(dRes.data || []);
    setNotes(nRes.data || []);
    setTasks(tRes.data || []);
    setEvents(eRes.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function addTaskLinked() {
    setErrorMsg(null);

    const payload = {
      title: (taskTitle || "").trim(),
      due_at: taskDueIso,
      contact_id: contactId,
      deal_id: null,
    };

    if (!payload.title) {
      setErrorMsg("Task title is required.");
      return;
    }

    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    console.log("addTaskLinked", { payload, data, error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTasks((prev) => [data, ...prev]);
    setTaskTitle("");
    setTaskDueAt("");
  }

  async function toggleTask(task) {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();

    console.log("toggleTask", { data, error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
  }

  async function addEventLinked() {
    setErrorMsg(null);

    const payload = {
      title: (eventTitle || "").trim(),
      start_at: eventStartIso,
      end_at: eventEndIso,
      contact_id: contactId,
      deal_id: null,
      location: null,
      notes: null,
    };

    if (!payload.title) {
      setErrorMsg("Event title is required.");
      return;
    }
    if (!payload.start_at || !payload.end_at) {
      setErrorMsg("Start and end times are required.");
      return;
    }
    if (new Date(payload.end_at).getTime() < new Date(payload.start_at).getTime()) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    const { data, error } = await supabase.from("calendar_events").insert(payload).select().single();
    console.log("addEventLinked", { payload, data, error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEvents((prev) => [...prev, data].sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))));
    setEventTitle("");
    setEventStart("");
    setEventEnd("");
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  if (!contact) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <div className="text-xl font-semibold">Contact not found</div>
        {errorMsg && <div className="text-sm text-red-700">{errorMsg}</div>}
      </div>
    );
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Unnamed Contact";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            <div className="text-sm text-gray-600 mt-1">
              {contact.email || "—"} • {contact.phone || "—"}
            </div>
            <div className="text-xs text-gray-400 mt-2">Contact ID: {contact.id}</div>
          </div>
          <button onClick={loadAll} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">{errorMsg}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals */}
        <div className="rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-medium">Deals</div>
            <div className="text-xs text-gray-500">{deals.length}</div>
          </div>
          <div className="divide-y">
            {deals.map((d) => (
              <div key={d.id} className="p-4">
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Status: {d.status || "—"} • Value: {d.value ?? 0}
                </div>
              </div>
            ))}
            {deals.length === 0 && <div className="p-6 text-sm text-gray-500">No deals yet.</div>}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-medium">Notes</div>
            <div className="text-xs text-gray-500">{notes.length}</div>
          </div>
          <div className="divide-y">
            {notes.map((n) => (
              <div key={n.id} className="p-4">
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : "—"}
                </div>
              </div>
            ))}
            {notes.length === 0 && <div className="p-6 text-sm text-gray-500">No notes yet.</div>}
          </div>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-medium">Tasks</div>
            <div className="text-xs text-gray-500">{tasks.length}</div>
          </div>

          <div className="p-4 border-b space-y-2">
            <div className="text-sm font-medium">Add Task</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Due (optional)</label>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                />
              </div>
              <button onClick={addTaskLinked} className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                Add
              </button>
            </div>
          </div>

          <div className="divide-y">
            {tasks.map((t) => (
              <div key={t.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!t.completed} onChange={() => toggleTask(t)} />
                    <div className={`font-medium truncate ${t.completed ? "line-through text-gray-500" : ""}`}>
                      {t.title}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="p-6 text-sm text-gray-500">No tasks yet.</div>}
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-2xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-medium">Calendar</div>
            <div className="text-xs text-gray-500">{events.length}</div>
          </div>

          <div className="p-4 border-b space-y-2">
            <div className="text-sm font-medium">Add Event</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Start</label>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">End</label>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                />
              </div>

              <button onClick={addEventLinked} className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                Add
              </button>
            </div>
          </div>

          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="p-4">
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(e.start_at).toLocaleString()} → {new Date(e.end_at).toLocaleString()}
                </div>
              </div>
            ))}
            {events.length === 0 && <div className="p-6 text-sm text-gray-500">No events yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}