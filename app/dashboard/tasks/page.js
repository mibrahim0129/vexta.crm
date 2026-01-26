"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");

  const dueAtIso = useMemo(() => {
    if (!dueAt) return null;
    const d = new Date(dueAt);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [dueAt]);

  async function loadTasks() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    console.log("loadTasks", { data, error });

    if (error) {
      setErrorMsg(error.message);
      setTasks([]);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function addTask() {
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      due_at: dueAtIso,
      contact_id: null,
      deal_id: null,
      // IMPORTANT: do NOT pass user_id from client
    };

    if (!payload.title) {
      setErrorMsg("Task title is required.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.from("tasks").insert(payload).select().single();

    console.log("addTask", { payload, data, error });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setTasks((prev) => [data, ...prev]);
    setTitle("");
    setDescription("");
    setDueAt("");
    setSaving(false);
  }

  async function toggleCompleted(task) {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();

    console.log("toggleCompleted", { data, error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
  }

  async function deleteTask(id) {
    setErrorMsg(null);

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    console.log("deleteTask", { error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-gray-500">
            Saves to Supabase table: <b>tasks</b>
          </p>
        </div>

        <button
          onClick={loadTasks}
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
        <div className="text-sm font-medium">Add Task</div>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Task title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Due (optional)</label>
            <input
              type="datetime-local"
              className="border rounded-lg px-3 py-2"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <button
            onClick={addTask}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">All Tasks</div>
          <div className="text-xs text-gray-500">{loading ? "Loading..." : `${tasks.length} tasks`}</div>
        </div>

        <div className="divide-y">
          {tasks.map((t) => (
            <div key={t.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!!t.completed} onChange={() => toggleCompleted(t)} />
                  <div className={`font-medium truncate ${t.completed ? "line-through text-gray-500" : ""}`}>
                    {t.title}
                  </div>
                </div>

                {t.description && <div className="text-sm text-gray-600 mt-1">{t.description}</div>}

                <div className="text-xs text-gray-400 mt-2">
                  Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "—"} • Created:{" "}
                  {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                </div>
              </div>

              <button onClick={() => deleteTask(t.id)} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
                Delete
              </button>
            </div>
          ))}

          {!loading && tasks.length === 0 && <div className="p-6 text-sm text-gray-500">No tasks yet.</div>}
        </div>
      </div>
    </div>
  );
}
