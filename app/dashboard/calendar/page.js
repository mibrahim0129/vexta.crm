"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [events, setEvents] = useState([]);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const startAtIso = useMemo(() => {
    if (!startAt) return null;
    const d = new Date(startAt);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [startAt]);

  const endAtIso = useMemo(() => {
    if (!endAt) return null;
    const d = new Date(endAt);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [endAt]);

  async function loadEvents() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_at", { ascending: true })
      .limit(200);

    console.log("loadEvents", { data, error });

    if (error) {
      setErrorMsg(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function addEvent() {
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      title: title.trim(),
      location: location.trim() ? location.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      start_at: startAtIso,
      end_at: endAtIso,
      contact_id: null,
      deal_id: null,
      // IMPORTANT: do NOT pass user_id from client
    };

    if (!payload.title) {
      setErrorMsg("Event title is required.");
      setSaving(false);
      return;
    }
    if (!payload.start_at || !payload.end_at) {
      setErrorMsg("Start and end are required.");
      setSaving(false);
      return;
    }
    if (new Date(payload.end_at).getTime() < new Date(payload.start_at).getTime()) {
      setErrorMsg("End time must be after start time.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.from("calendar_events").insert(payload).select().single();

    console.log("addEvent", { payload, data, error });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setEvents((prev) => [...prev, data].sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))));
    setTitle("");
    setLocation("");
    setNotes("");
    setStartAt("");
    setEndAt("");
    setSaving(false);
  }

  async function deleteEvent(id) {
    setErrorMsg(null);

    const { error } = await supabase.from("calendar_events").delete().eq("id", id);

    console.log("deleteEvent", { error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-gray-500">
            Saves to Supabase table: <b>calendar_events</b>
          </p>
        </div>

        <button
          onClick={loadEvents}
          className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">Add Event</div>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Event title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <textarea
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Start</label>
            <input
              type="datetime-local"
              className="border rounded-lg px-3 py-2"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">End</label>
            <input
              type="datetime-local"
              className="border rounded-lg px-3 py-2"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>

          <button
            onClick={addEvent}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Upcoming</div>
          <div className="text-xs text-gray-500">{loading ? "Loading..." : `${events.length} events`}</div>
        </div>

        <div className="divide-y">
          {events.map((e) => (
            <div key={e.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{e.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(e.start_at).toLocaleString()} → {new Date(e.end_at).toLocaleString()}
                </div>
                {e.location && <div className="text-sm text-gray-600 mt-1">📍 {e.location}</div>}
                {e.notes && <div className="text-sm text-gray-600 mt-2">{e.notes}</div>}
              </div>

              <button onClick={() => deleteEvent(e.id)} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
                Delete
              </button>
            </div>
          ))}

          {!loading && events.length === 0 && <div className="p-6 text-sm text-gray-500">No events yet.</div>}
        </div>
      </div>
    </div>
  );
}
