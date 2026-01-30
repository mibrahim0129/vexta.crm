"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Soft gating
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

export default function NotesPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();
  const canWrite = !subLoading && access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);

  // Filters
  const [filterContactId, setFilterContactId] = useState("all");

  // Form
  const [form, setForm] = useState({
    contact_id: "",
    deal_id: "",
    body: "",
  });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/notes";
      return null;
    }
    return data.session;
  }

  async function loadContacts() {
    const { data, error } = await sb
      .from("contacts")
      .select("id, first_name, last_name")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    setContacts(list);

    // default selected contact for form
    if (!form.contact_id && list.length > 0) {
      setForm((p) => ({ ...p, contact_id: list[0].id }));
    }
  }

  async function loadDeals(contactIdForDeals) {
    // Load deals optionally filtered by contact (so deal dropdown stays relevant)
    let q = sb
      .from("deals")
      .select("id, title, contact_id")
      .order("created_at", { ascending: false });

    if (contactIdForDeals && contactIdForDeals !== "all") {
      q = q.eq("contact_id", contactIdForDeals);
    }

    const { data, error } = await q;
    if (error) throw error;

    setDeals(Array.isArray(data) ? data : []);
  }

  async function loadNotes() {
    const session = await requireSession();
    if (!session) return;

    setErr("");
    setLoading(true);

    try {
      let q = sb
        .from("notes")
        .select(
          `
          id,
          body,
          contact_id,
          deal_id,
          created_at,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .order("created_at", { ascending: false });

      if (filterContactId !== "all") {
        q = q.eq("contact_id", filterContactId);
      }

      const { data, error } = await q;
      if (error) throw error;

      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load notes");
      setNotes([]);
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

      await loadContacts();
      await loadDeals(filterContactId === "all" ? form.contact_id : filterContactId);
      await loadNotes();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    setErr("");

    // ✅ Soft gating: block create, but still allow viewing
    if (!canWrite) {
      setErr("Upgrade required to add new notes.");
      return;
    }

    const body = form.body.trim();
    if (!body) {
      setErr("Note can’t be empty.");
      return;
    }
    if (!form.contact_id) {
      setErr("Please select a contact.");
      return;
    }

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const dealId = form.deal_id ? form.deal_id : null;

      const { data, error } = await sb
        .from("notes")
        .insert([
          {
            user_id: session.user.id,
            contact_id: form.contact_id,
            deal_id: dealId,
            body,
          },
        ])
        .select(
          `
          id,
          body,
          contact_id,
          deal_id,
          created_at,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .single();

      if (error) throw error;

      setNotes((prev) => [data, ...prev]);
      setForm((p) => ({ ...p, body: "" })); // keep contact selection
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    setErr("");
    const ok = confirm("Delete this note?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("notes").delete().eq("id", noteId);
      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete note");
    }
  }

  // When filter changes, reload notes + deals list for that contact
  useEffect(() => {
    (async () => {
      await loadDeals(filterContactId === "all" ? form.contact_id : filterContactId);
      await loadNotes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterContactId]);

  // When form.contact_id changes, refresh deals dropdown and clear deal selection
  useEffect(() => {
    if (!form.contact_id) return;
    (async () => {
      await loadDeals(form.contact_id);
      setForm((p) => ({ ...p, deal_id: "" }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_id]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      const channel = sb.channel("notes-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
          if (mountedRef.current) loadNotes();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadAll();
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContacts = contacts.length > 0;

  // ✅ For notes: you must have contacts AND have write access to create
  const canCreate = hasContacts && canWrite;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Notes</h1>
          <p style={styles.sub}>
            Activity log • Realtime: <span style={styles.badge}>{rtStatus}</span>
            {" "}
            <span style={{ opacity: 0.85 }}>
              {subLoading ? " • Checking plan…" : ` • Plan: ${plan || "Free"}`}
            </span>
          </p>
        </div>

        <div style={styles.headerRight}>
          <select
            value={filterContactId}
            onChange={(e) => setFilterContactId(e.target.value)}
            style={styles.selectSmall}
          >
            <option value="all">All contacts</option>
            {contacts.map((c) => {
              const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
              return (
                <option key={c.id} value={c.id}>
                  {name}
                </option>
              );
            })}
          </select>

          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ Upgrade banner */}
      {!subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to add notes"
            body="You can view your existing notes, but adding new notes requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Note</h2>

        <form onSubmit={addNote} style={styles.form}>
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
                contacts.map((c) => {
                  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
                  return (
                    <option key={c.id} value={c.id}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>

            <select
              value={form.deal_id}
              onChange={(e) => setForm((p) => ({ ...p, deal_id: e.target.value }))}
              style={styles.select}
              disabled={!canCreate || saving}
            >
              <option value="">No deal (optional)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Write your note..."
            style={styles.textarea}
            rows={4}
            disabled={!canCreate || saving}
          />

          <button
            type="submit"
            disabled={!canCreate || saving}
            style={{
              ...styles.btnPrimary,
              ...( !canWrite
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
            {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Note"}
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

          {hasContacts && !subLoading && !access ? (
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Adding notes is disabled until you upgrade.
            </div>
          ) : null}
        </form>
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={styles.h2}>
          Notes {loading ? "(loading...)" : `(${notes.length})`}
        </h2>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : notes.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No notes yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {notes.map((n) => {
              const c = n.contacts;
              const d = n.deals;

              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "Unknown";

              return (
                <div key={n.id} style={styles.noteItem}>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.body}</div>

                  <div style={styles.noteMeta}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <span style={{ opacity: 0.75 }}>Contact:</span>{" "}
                        {n.contact_id ? (
                          <Link href={`/dashboard/contacts/${n.contact_id}`} style={styles.link}>
                            {contactName}
                          </Link>
                        ) : (
                          <span>{contactName}</span>
                        )}
                      </div>

                      {d?.title ? (
                        <div>
                          <span style={{ opacity: 0.75 }}>Deal:</span>{" "}
                          <span style={{ fontWeight: 900 }}>{d.title}</span>
                        </div>
                      ) : null}
                    </div>

                    <button onClick={() => deleteNote(n.id)} style={styles.btnDanger}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
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

  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  card: {
    marginTop: 18,
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

  noteItem: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 10,
  },

  noteMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
    borderTop: "1px solid #242424",
    opacity: 0.95,
    fontSize: 13,
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
