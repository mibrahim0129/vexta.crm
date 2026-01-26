"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TaskRow = {
  id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  completed: boolean;
  created_at: string;
};

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string>("");

  const dueAtIso = useMemo(() => {
    if (!dueAt) return null;
    // dueAt from input datetime-local, convert to ISO
    const d = new Date(dueAt);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }, [dueAt]);

  async function loadTasks() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErrorMsg(error.message);
      setTasks([]);
      setLoading(false);
      return;
    }

    setTasks((data ?? []) as TaskRow[]);
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
      // IMPORTANT: do NOT send user_id from client
    };

    if (!payload.title) {
      setErrorMsg("Task title is required.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select()
      .single();

    console.log("addTask result", { data, error });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setTasks((prev) => [data as TaskRow, ...prev]);
    setTitle("");
    setDescription("");
    setDueAt("");
    setSaving(false);
  }

  async function toggleCompleted(task: TaskRow) {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();

    console.log("toggleCompleted result", { data, error });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === task.id ? (data as TaskRow) : t)));
  }

  async function deleteTask(id: string) {
    setErrorMsg(null);

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    console.log("deleteTask result", { error });

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
          <p className="text-sm text-gray-500">Create and manage tasks (saved in Supabase table: <b>tasks</b>).</p>
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

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Due date (optional)</label>
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
            className="mt-5 px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
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
                  <input type="checkbox" checked={t.completed} onChange={() => toggleCompleted(t)} />
                  <div className={`font-medium truncate ${t.completed ? "line-through text-gray-500" : ""}`}>
                    {t.title}
                  </div>
                </div>
                {t.description && <div className="text-sm text-gray-600 mt-1">{t.description}</div>}
                <div className="text-xs text-gray-400 mt-2">
                  Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "—"} • Created:{" "}
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => deleteTask(t.id)}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Delete
              </button>
            </div>
          ))}

          {!loading && tasks.length === 0 && (
            <div className="p-6 text-sm text-gray-500">No tasks yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
