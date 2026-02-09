"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Subscription gating
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

function safeName(c) {
  if (!c) return "Unknown";
  return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
}

function fmtDate(d) {
  try {
    return d ? new Date(d).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

export default function NotesPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Subscription gating (no beta bypass)
  const { loading: subLoading, access, plan } = useSubscription();
  const canWrite = !subLoading && !!access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);

  // Filters
  const [filterContactId, setFilterContactId] = useState("all");
  const [query, setQuery] = useState("");

  // Form
  const [form, setForm] = useState({
    contact_id: "",
    deal_id: "",
    body: "",
  });

  // ✅ Edit modal
  const [editing, setEditing] = useState(null); // note row
  const [editForm, setEditForm] = useState({ body: "", deal_id: "" });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/notes";
      return null;
    }
    return data.session;
  }

  function requireWriteOrWarn(message) {
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

  async function loadContactsWithSession(session) {
    const { data, error } = await sb
      .from("contacts")
      .select("id, first_name, last_name, created_at, user_id")
      .eq("user_id", session.user.id) // ✅ RLS-safe
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    setContacts(list);

    // default selected contact for form
    setForm((p) => {
      if (p.contact_id) return p;
      return list.length > 0 ? { ...p, contact_id: list[0].id } : p;
    });
  }

  async function loadDealsWithSession(session, contactIdForDeals) {
    let q = sb
      .from("deals")
      .select("id, title, contact_id, created_at, user_id")
      .eq("user_id", session.user.id) // ✅ RLS-safe
      .order("created_at", { ascending: false });

    if (contactIdForDeals && contactIdForDeals !== "all") {
      q = q.eq("contact_id", contactIdForDeals);
    }

    const { data, error } = await q;
    if (error) throw error;

    setDeals(Array.isArray(data) ? data : []);
  }

  async function loadNotesWithSession(session) {
    setErr("");

    try {
      let q = sb
        .from("notes")
        .select(
          `
          id,
          body,
          user_id,
          contact_id,
          deal_id,
          created_at,
          contacts:contact_id ( id, first_name, last_name ),
          deals:deal_id ( id, title )
        `
        )
        .eq("user_id", session.user.id) // ✅ critical for RLS + privacy
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
    }
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const session = await requireSession();
      if (!session) return;

      await loadContactsWithSession(session);
      await loadDealsWithSession(session, filterContactId === "all" ? form.contact_id : filterContactId);
      await loadNotesWithSession(session);
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

    if (!requireWriteOrWarn("Upgrade required to add new notes.")) return;

    const body = (form.body || "").trim();
    if (!body) return setErr("Note can’t be empty.");
    if (!form.contact_id) return setErr("Please select a contact.");

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
          user_id,
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
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  // ✅ RLS-safe update helper
  async function updateNote(noteId, patch) {
    const session = await requireSession();
    if (!session) return null;

    const { data, error } = await sb
      .from("notes")
      .update(patch)
      .eq("id", noteId)
      .eq("user_id", session.user.id) // ✅ critical for RLS
      .select(
        `
        id,
        body,
        user_id,
        contact_id,
        deal_id,
        created_at,
        contacts:contact_id ( id, first_name, last_name ),
        deals:deal_id ( id, title )
      `
      )
      .single();

    if (error) throw error;
    return data;
  }

  function openEdit(n) {
    setErr("");
    setEditing(n);
    setEditForm({
      body: n.body || "",
      deal_id: n.deal_id || "",
    });
  }

  function closeEdit() {
    if (saving) return;
    setEditing(null);
    setEditForm({ body: "", deal_id: "" });
  }

  async function saveEdit() {
    setErr("");
    if (!editing) return;

    if (!requireWriteOrWarn("Upgrade required to edit notes.")) return;

    const body = (editForm.body || "").trim();
    if (!body) return setErr("Note can’t be empty.");

    setSaving(true);
    try {
      const patch = {
        body,
        deal_id: editForm.deal_id ? editForm.deal_id : null,
      };

      const updated = await updateNote(editing.id, patch);
      if (!updated) return;

      setNotes((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      closeEdit();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    setErr("");

    if (!requireWriteOrWarn("Upgrade required to delete notes.")) return;

    const ok = confirm("Delete this note?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("notes").delete().eq("id", noteId).eq("user_id", session.user.id);
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
      const session = await requireSession();
      if (!session) return;

      await loadDealsWithSession(session, filterContactId === "all" ? form.contact_id : filterContactId);
      await loadNotesWithSession(session);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterContactId]);

  // When form.contact_id changes, refresh deals dropdown and clear deal selection
  useEffect(() => {
    if (!form.contact_id) return;
    (async () => {
      const session = await requireSession();
      if (!session) return;

      await loadDealsWithSession(session, form.contact_id);
      setForm((p) => ({ ...p, deal_id: "" }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_id]);

  useEffect(() => {
    mountedRef.current = true;

    let channel;

    (async () => {
      await loadAll();

      channel = sb.channel("notes-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
          if (mountedRef.current) {
            (async () => {
              const session = await requireSession();
              if (!session) return;
              await loadNotesWithSession(session);
            })();
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          if (mountedRef.current) loadAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadAll();
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));
    })();

    return () => {
      mountedRef.current = false;
      if (channel) sb.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContacts = contacts.length > 0;
  const disableWrites = subLoading || !canWrite;
  const canCreate = hasContacts && canWrite && !subLoading;

  const normalizedQuery = String(query || "").trim().toLowerCase();
  const shownNotes = notes.filter((n) => {
    if (!normalizedQuery) return true;
    const cName = safeName(n.contacts).toLowerCase();
    const dTitle = String(n.deals?.title || "").toLowerCase();
    const body = String(n.body || "").toLowerCase();
    return `${body} ${cName} ${dTitle}`.includes(normalizedQuery);
  });

  return (
    <div>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.h1}>Notes</h1>
            <span style={styles.pill}>Realtime: {rtStatus}</span>
            <span style={styles.pillMuted}>
              {subLoading ? "Checking plan…" : access ? `Plan: ${plan || "Active"}` : "Plan required"}
            </span>
            <span style={styles.pillMuted}>{loading ? "Loading…" : `${shownNotes.length} shown`}</span>
          </div>
          <p style={styles.sub}>Your activity log across contacts and deals.</p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ Upgrade banner */}
      {!subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to add notes"
            body="You can view your existing notes, but adding, editing, or deleting notes requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Filters */}
      <div style={styles.controls}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, contacts, or deals…"
          style={styles.search}
        />

        <select value={filterContactId} onChange={(e) => setFilterContactId(e.target.value)} style={styles.selectPill}>
          <option value="all">All contacts</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {safeName(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Add Note */}
      <div style={styles.card}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Add Note</h2>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {!hasContacts ? (
              <>
                Add a contact first in{" "}
                <Link href="/dashboard/contacts" style={{ color: "white", fontWeight: 900 }}>
                  Contacts
                </Link>
                .
              </>
            ) : disableWrites ? (
              "Writes are disabled until upgrade."
            ) : (
              "Attach a note to a contact (and optionally a deal)."
            )}
          </div>
        </div>

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
                contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {safeName(c)}
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
            placeholder="Write your note… (next steps, call recap, client preferences, etc.)"
            style={styles.textarea}
            rows={4}
            disabled={!canCreate || saving}
          />

          <div style={styles.formBottom}>
            <button
              type="submit"
              disabled={!canCreate || saving}
              style={{
                ...styles.btnPrimary,
                ...(disableWrites
                  ? {
                      opacity: 0.55,
                      cursor: "not-allowed",
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.65)",
                    }
                  : {}),
              }}
            >
              {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Note"}
            </button>

            <div style={{ fontSize: 12, opacity: 0.7 }}>Tip: Use notes as your running log — you’ll close faster.</div>
          </div>
        </form>
      </div>

      {/* Notes list */}
      <div style={{ marginTop: 18 }}>
        <div style={styles.listHeader}>
          <h2 style={styles.h2}>Notes</h2>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13 }}>{loading ? "Loading…" : `${notes.length} total`}</div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : shownNotes.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>No notes found</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Try clearing your search/filter, or add your first note above.</div>
          </div>
        ) : (
          <div style={styles.listGrid}>
            {shownNotes.map((n) => {
              const c = n.contacts;
              const d = n.deals;

              const contactName = safeName(c);

              return (
                <div key={n.id} style={styles.noteCard}>
                  <div style={styles.noteTop}>
                    <div style={styles.noteChips}>
                      <span style={styles.chip}>Contact</span>
                      {n.contact_id ? (
                        <Link href={`/dashboard/contacts/${n.contact_id}`} style={styles.contactLink}>
                          {contactName}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 900 }}>{contactName}</span>
                      )}

                      {d?.title ? (
                        <>
                          <span style={styles.chipMuted}>Deal</span>
                          <span style={{ fontWeight: 900 }}>{d.title}</span>
                        </>
                      ) : null}
                    </div>

                    <div style={styles.noteRight}>
                      <span style={styles.time}>{fmtDate(n.created_at)}</span>

                      <button
                        onClick={() => (disableWrites ? null : openEdit(n))}
                        style={{
                          ...styles.btnMini,
                          ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                        }}
                        disabled={disableWrites}
                        type="button"
                        title={disableWrites ? "Upgrade required" : "Edit note"}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => (disableWrites ? null : deleteNote(n.id))}
                        style={{
                          ...styles.btnMini,
                          ...styles.btnMiniDanger,
                          ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                        }}
                        disabled={disableWrites}
                        type="button"
                        title={disableWrites ? "Upgrade required" : "Delete note"}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={styles.body}>{n.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Edit modal */}
      {editing ? (
        <div style={styles.modalOverlay} onMouseDown={closeEdit}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Edit Note</div>
              <button onClick={closeEdit} type="button" style={styles.btnGhost} disabled={saving}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                Contact: <span style={{ opacity: 0.9 }}>{editing.contact_id ? safeName(editing.contacts) : "Unknown"}</span>
              </div>

              <select
                value={editForm.deal_id}
                onChange={(e) => setEditForm((p) => ({ ...p, deal_id: e.target.value }))}
                style={styles.select}
                disabled={saving}
              >
                <option value="">No deal (optional)</option>
                {deals
                  .filter((d) => (editing?.contact_id ? d.contact_id === editing.contact_id : true))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </select>

              <textarea
                value={editForm.body}
                onChange={(e) => setEditForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Update your note…"
                style={styles.textarea}
                rows={6}
                disabled={saving}
              />

              {!subLoading && !access ? (
                <div style={{ ...styles.alert, marginTop: 0 }}>Upgrade required to save changes.</div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button onClick={closeEdit} type="button" style={styles.btnGhost} disabled={saving}>
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  type="button"
                  style={{ ...styles.btnPrimary, ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}) }}
                  disabled={saving || disableWrites}
                  title={disableWrites ? "Upgrade required" : "Save changes"}
                >
                  {saving ? "Saving..." : subLoading ? "Checking plan…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  headerRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  titleRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  h1: { margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -0.4 },
  sub: { marginTop: 8, opacity: 0.75, maxWidth: 820 },

  pill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  pillMuted: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.9,
    whiteSpace: "nowrap",
  },

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.28)",
    color: "#fecaca",
    fontWeight: 850,
  },

  controls: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  search: {
    flex: "1 1 260px",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },
  selectPill: {
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

  h2: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: -0.2 },

  card: {
    marginTop: 18,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },

  form: { marginTop: 12, display: "grid", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },

  select: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },

  textarea: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.5,
    fontWeight: 650,
  },

  formBottom: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" },

  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "white",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    width: "fit-content",
  },

  listHeader: { marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },

  empty: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  listGrid: { marginTop: 12, display: "grid", gap: 12 },

  noteCard: {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  noteTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },

  noteChips: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.9,
    whiteSpace: "nowrap",
  },
  chipMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.8,
    whiteSpace: "nowrap",
  },

  contactLink: { color: "white", fontWeight: 950, textDecoration: "none" },

  noteRight: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  time: { fontSize: 12, opacity: 0.7, fontWeight: 850, whiteSpace: "nowrap" },

  btnMini: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
  },
  btnMiniDanger: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
  },

  body: { marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.55, opacity: 0.95 },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "grid",
    placeItems: "center",
    padding: 14,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 760,
    background: "#0f0f0f",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
  },
};
