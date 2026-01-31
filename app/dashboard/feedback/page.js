// app/dashboard/feedback/page.js
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function FeedbackPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const pathname = usePathname();
  const router = useRouter();

  const [type, setType] = useState("bug"); // bug | idea | question
  const [page, setPage] = useState("");
  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/feedback";
      return null;
    }
    return data.session;
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    const msg = message.trim();
    if (!msg) return setErr("Please write a message.");

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const email = session.user?.email || null;

      const payload = {
        user_id: session.user.id,
        email,
        type,
        page: (page || "").trim() || pathname || "/dashboard",
        message: msg,
      };

      const { error } = await sb.from("feedback").insert([payload]);
      if (error) throw error;

      setOk("Thanks! Your feedback was sent.");
      setMessage("");
      setPage("");
      setType("bug");
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to send feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Feedback</h1>
          <p style={styles.sub}>
            Report bugs, request features, or ask questions. This goes straight into your beta queue.
          </p>
        </div>

        <button onClick={() => router.back()} style={styles.btnGhost} type="button">
          ← Back
        </button>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}
      {ok ? <div style={styles.ok}>{ok}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Send feedback</h2>

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.grid2}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select} disabled={saving}>
              <option value="bug">Bug</option>
              <option value="idea">Feature idea</option>
              <option value="question">Question</option>
            </select>

            <input
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="Page (optional) e.g. /dashboard/tasks"
              style={styles.input}
              disabled={saving}
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened? What should happen instead? Steps to reproduce?"
            style={styles.textarea}
            rows={6}
            disabled={saving}
          />

          <button type="submit" style={styles.btnPrimary} disabled={saving}>
            {saving ? "Sending..." : "Send feedback"}
          </button>

          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12, lineHeight: 1.4 }}>
            Tip: If it’s a bug, include what you clicked + what you expected.
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75, maxWidth: 720 },

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  card: {
    marginTop: 14,
    padding: 16,
    border: "1px solid #242424",
    borderRadius: 16,
    background: "#111111",
  },

  form: { marginTop: 12, display: "grid", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
    fontWeight: 900,
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
    fontWeight: 800,
  },

  textarea: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
    resize: "vertical",
    fontWeight: 800,
    lineHeight: 1.45,
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
    textDecoration: "none",
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

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#1a0f0f",
    border: "1px solid #5a1f1f",
    color: "#ffd6d6",
    fontWeight: 900,
  },

  ok: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    color: "rgba(220, 252, 231, 0.95)",
    fontWeight: 900,
  },
};
