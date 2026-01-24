"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ContactDetailPage() {
  const { id } = useParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [contact, setContact] = useState(null);
  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);

  const [dealForm, setDealForm] = useState({ title: "", status: "lead", value: "" });
  const [noteBody, setNoteBody] = useState("");

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = `/login?next=/dashboard/contacts/${id}`;
      return null;
    }
    return data.session;
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const { data: c, error: ce } = await sb
        .from("contacts")
        .select("id, first_name, last_name, email, phone, created_at")
        .eq("id", id)
        .single();
      if (ce) throw ce;

      const { data: d, error: de } = await sb
        .from("deals")
        .select("id, title, status, value, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });
      if (de) throw de;

      const { data: n, error: ne } = await sb
        .from("notes")
        .select("id, body, deal_id, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });
      if (ne) throw ne;

      setContact(c);
      setDeals(Array.isArray(d) ? d : []);
      setNotes(Array.isArray(n) ? n : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }

  async function addDeal(e) {
    e.preventDefault();
    setErr("");

    if (!dealForm.title.trim()) {
      setErr("Deal title is required.");
      return;
    }

    try {
      const session = await requireSession();
      if (!session) return;

      const valueNum = dealForm.value === "" ? 0 : Number(dealForm.value);
      const safeValue = Number.isFinite(valueNum) ? valueNum : 0;

      const { data, error } = await sb
        .from("deals")
        .insert([
          {
            user_id: session.user.id,
            contact_id: id,
            title: dealForm.title.trim(),
            status: dealForm.status,
            value: safeValue,
          },
        ])
        .select("id, title, status, value, created_at")
        .single();

      if (error) throw error;

      setDeals((prev) => [data, ...prev]);
      setDealForm({ title: "", status: "lead", value: "" });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add deal");
    }
  }

  async function addNote(e) {
    e.preventDefault();
    setErr("");

    if (!noteBody.trim()) {
      setErr("Note can’t be empty.");
      return;
    }

    try {
      const session = await requireSession();
      if (!session) return;

      const { data, error } = await sb
        .from("notes")
        .insert([
          {
            user_id: session.user.id,
            contact_id: id,
            deal_id: null,
            body: noteBody.trim(),
          },
        ])
        .select("id, body, deal_id, created_at")
        .single();

      if (error) throw error;

      setNotes((prev) => [data, ...prev]);
      setNoteBody("");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add note");
    }
  }

  async function deleteDeal(dealId) {
    setErr("");
    const ok = confirm("Delete this deal?");
    if (!ok) return;

    try {
      const { error } = await sb.from("deals").delete().eq("id", dealId);
      if (error) throw error;
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete deal");
    }
  }

  async function deleteNote(noteId) {
    setErr("");
    const ok = confirm("Delete this note?");
    if (!ok) return;

    try {
      const { error } = await sb.from("notes").delete().eq("id", noteId);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete note");
    }
  }

  useEffect(() => {
    loadAll();

    const ch = sb
      .channel(`contact-${id}-sync`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => loadAll())
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const displayName = contact
    ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed"
    : "";

  return (
    <div>
      <div style={styles.top}>
        <div>
          <h1 style={styles.h1}>{loading ? "Loading..." : displayName}</h1>
          <p style={styles.sub}>
            {contact?.email ? `Email: ${contact.email}` : null}
            {contact?.email && contact?.phone ? " • " : null}
            {contact?.phone ? `Phone: ${contact.phone}` : null}
          </p>
        </div>

        <a href="/dashboard/contacts" style={styles.btnGhost}>
          ← Back
        </a>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Deals</h2>

          <form onSubmit={addDeal} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              value={dealForm.title}
              onChange={(e) => setDealForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Deal title (ex: 123 Main St Listing)"
              style={styles.input}
            />

            <div style={styles.grid2}>
              <select
                value={dealForm.status}
                onChange={(e) => setDealForm((p) => ({ ...p, status: e.target.value }))}
                style={styles.select}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="under_contract">Under Contract</option>
                <option value="closed">Closed</option>
              </select>

              <input
                value={dealForm.value}
                onChange={(e) => setDealForm((p) => ({ ...p, value: e.target.value }))}
                placeholder="Value ($)"
                style={styles.input}
              />
            </div>

            <button style={styles.btnPrimary}>Add Deal</button>
          </form>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {deals.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No deals yet.</div>
            ) : (
              deals.map((d) => (
                <div key={d.id} style={styles.itemRow}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{d.title}</div>
                    <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
                      Status: {d.status} • Value: ${Number(d.value || 0).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => deleteDeal(d.id)} style={styles.btnDanger}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.h2}>Notes</h2>

          <form onSubmit={addNote} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write a note..."
              style={styles.textarea}
              rows={4}
            />
            <button style={styles.btnPrimary}>Add Note</button>
          </form>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {notes.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No notes yet.</div>
            ) : (
              notes.map((n) => (
                <div key={n.id} style={styles.noteItem}>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{n.body}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button onClick={() => deleteNote(n.id)} style={styles.btnDanger}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

  grid: { marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  card: { padding: 16, border: "1px solid #242424", borderRadius: 16, background: "#111111" },
  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

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

  itemRow: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #242424",
    background: "#101010",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  noteItem: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #242424",
    background: "#101010",
  },

  btnGhost: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    textDecoration: "none",
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
  },

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#1a0f0f",
    border: "1px solid #5a1f1f",
    color: "#ffd6d6",
  },
};
