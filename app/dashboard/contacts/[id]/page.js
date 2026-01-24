"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ContactDetailPage({ params }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const mountedRef = useRef(false);

  const contactId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contact, setContact] = useState(null);
  const [deals, setDeals] = useState([]);
  const [notes, setNotes] = useState([]);

  // Edit form
  const [edit, setEdit] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  // Add Deal form
  const [dealForm, setDealForm] = useState({
    title: "",
    status: "lead",
    value: "",
  });

  // Add Note form
  const [noteBody, setNoteBody] = useState("");

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = `/login?next=/dashboard/contacts/${contactId}`;
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

      const [{ data: c, error: cErr }, { data: d, error: dErr }, { data: n, error: nErr }] =
        await Promise.all([
          sb
            .from("contacts")
            .select("id, first_name, last_name, email, phone, created_at")
            .eq("id", contactId)
            .single(),
          sb
            .from("deals")
            .select("id, title, status, value, created_at")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: false }),
          sb
            .from("notes")
            .select("id, body, deal_id, created_at, deals:deal_id ( id, title )")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: false }),
        ]);

      if (cErr) throw cErr;
      if (dErr) throw dErr;
      if (nErr) throw nErr;

      setContact(c || null);
      setDeals(Array.isArray(d) ? d : []);
      setNotes(Array.isArray(n) ? n : []);

      // prime edit form
      setEdit({
        first_name: c?.first_name || "",
        last_name: c?.last_name || "",
        email: c?.email || "",
        phone: c?.phone || "",
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }

  async function saveContact(e) {
    e?.preventDefault?.();
    setErr("");
    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const payload = {
        first_name: edit.first_name.trim() || null,
        last_name: edit.last_name.trim() || null,
        email: edit.email.trim() || null,
        phone: edit.phone.trim() || null,
      };

      const { data, error } = await sb
        .from("contacts")
        .update(payload)
        .eq("id", contactId)
        .select("id, first_name, last_name, email, phone, created_at")
        .single();

      if (error) throw error;

      setContact(data);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  async function addDeal(e) {
    e.preventDefault();
    setErr("");

    const title = dealForm.title.trim();
    if (!title) {
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
            contact_id: contactId,
            title,
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

    const body = noteBody.trim();
    if (!body) {
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
            contact_id: contactId,
            deal_id: null,
            body,
          },
        ])
        .select("id, body, deal_id, created_at, deals:deal_id ( id, title )")
        .single();

      if (error) throw error;

      setNotes((prev) => [data, ...prev]);
      setNoteBody("");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add note");
    }
  }

  async function deleteContact() {
    setErr("");
    const ok = confirm("Delete this contact? This will also delete their notes.");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("contacts").delete().eq("id", contactId);
      if (error) throw error;

      router.push("/dashboard/contacts");
      router.refresh();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete contact");
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      // Realtime: refresh this page if related rows change
      const channel = sb.channel(`contact-${contactId}-rt`);

      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, (p) => {
          if (p?.new?.id === contactId || p?.old?.id === contactId) {
            if (mountedRef.current) loadAll();
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (p) => {
          if (p?.new?.contact_id === contactId || p?.old?.contact_id === contactId) {
            if (mountedRef.current) loadAll();
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (p) => {
          if (p?.new?.contact_id === contactId || p?.old?.contact_id === contactId) {
            if (mountedRef.current) loadAll();
          }
        })
        .subscribe((status) => setRtStatus(String(status || "").toLowerCase()));

      return () => {
        mountedRef.current = false;
        sb.removeChannel(channel);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const displayName =
    contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed" : "Contact";

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            <Link href="/dashboard/contacts" style={styles.breadcrumb}>
              Contacts
            </Link>{" "}
            / {displayName}
          </div>
          <h1 style={styles.h1}>{displayName}</h1>
          <p style={styles.sub}>
            Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={deleteContact} style={styles.btnDanger}>
            Delete
          </button>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      {loading && !contact ? (
        <div style={{ opacity: 0.75 }}>Loading…</div>
      ) : !contact ? (
        <div style={{ opacity: 0.75 }}>Contact not found.</div>
      ) : (
        <>
          {/* EDIT CONTACT */}
          <div style={styles.card}>
            <h2 style={styles.h2}>Edit Contact</h2>

            <form onSubmit={saveContact} style={styles.form}>
              <div style={styles.grid2}>
                <input
                  value={edit.first_name}
                  onChange={(e) => setEdit((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="First name"
                  style={styles.input}
                />
                <input
                  value={edit.last_name}
                  onChange={(e) => setEdit((p) => ({ ...p, last_name: e.target.value }))}
                  placeholder="Last name"
                  style={styles.input}
                />
              </div>

              <div style={styles.grid2}>
                <input
                  value={edit.email}
                  onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  style={styles.input}
                />
                <input
                  value={edit.phone}
                  onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone"
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={saving} style={styles.btnPrimary}>
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </form>
          </div>

          {/* QUICK ADD: DEAL */}
          <div style={styles.card}>
            <h2 style={styles.h2}>Add Deal</h2>
            <form onSubmit={addDeal} style={styles.form}>
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

              <button type="submit" style={styles.btnPrimary}>
                Add Deal
              </button>
            </form>
          </div>

          {/* QUICK ADD: NOTE */}
          <div style={styles.card}>
            <h2 style={styles.h2}>Add Note</h2>
            <form onSubmit={addNote} style={styles.form}>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Write a note..."
                style={styles.textarea}
                rows={4}
              />
              <button type="submit" style={styles.btnPrimary}>
                Add Note
              </button>
            </form>
          </div>

          {/* DEALS LIST */}
          <div style={{ marginTop: 18 }}>
            <h2 style={styles.h2}>Deals ({deals.length})</h2>
            {deals.length === 0 ? (
              <div style={{ opacity: 0.75, marginTop: 10 }}>No deals yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {deals.map((d) => (
                  <div key={d.id} style={styles.listItem}>
                    <div style={{ fontWeight: 950 }}>{d.title}</div>
                    <div style={styles.meta}>
                      Status: <b>{d.status}</b> • Value: ${Number(d.value || 0).toLocaleString()}
                    </div>
                    <Link href="/dashboard/deals" style={styles.linkSmall}>
                      Edit deals →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NOTES LIST */}
          <div style={{ marginTop: 18 }}>
            <h2 style={styles.h2}>Notes ({notes.length})</h2>
            {notes.length === 0 ? (
              <div style={{ opacity: 0.75, marginTop: 10 }}>No notes yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {notes.map((n) => (
                  <div key={n.id} style={styles.noteItem}>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.body}</div>
                    <div style={styles.meta}>
                      {n.deals?.title ? (
                        <>
                          Deal: <b>{n.deals.title}</b> •{" "}
                        </>
                      ) : null}
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

  breadcrumb: { color: "white", textDecoration: "none", fontWeight: 900 },

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
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 13,
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

  listItem: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 6,
  },

  noteItem: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "grid",
    gap: 8,
  },

  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },

  linkSmall: { color: "white", fontWeight: 900, textDecoration: "underline", fontSize: 13 },
};
