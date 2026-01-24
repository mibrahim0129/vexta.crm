"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ContactsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [contacts, setContacts] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/contacts";
      return null;
    }
    return data.session;
  }

  async function loadContacts() {
    setErr("");
    setLoading(true);

    try {
      const session = await requireSession();
      if (!session) return;

      const { data, error } = await sb
        .from("contacts")
        .select("id, first_name, last_name, email, phone, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setContacts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  async function addContact(e) {
    e.preventDefault();
    setErr("");

    const first = form.first_name.trim();
    const last = form.last_name.trim();

    if (!first && !last) {
      setErr("Please enter at least a first name or last name.");
      return;
    }

    setSaving(true);
    try {
      const session = await requireSession();
      if (!session) return;

      const { data, error } = await sb
        .from("contacts")
        .insert([
          {
            user_id: session.user.id,
            first_name: first || null,
            last_name: last || null,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
          },
        ])
        .select("id, first_name, last_name, email, phone, created_at")
        .single();

      if (error) throw error;

      setContacts((prev) => [data, ...prev]);
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id) {
    setErr("");
    const ok = confirm("Delete this contact? This will also delete their notes.");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("contacts").delete().eq("id", id);

      if (error) throw error;

      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete contact");
    }
  }

  useEffect(() => {
    loadContacts();

    // Optional realtime sync (only works if you enabled replication for these tables)
    const channel = sb
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        () => loadContacts()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Contacts</h1>
          <p style={styles.sub}>Add and manage your CRM contacts (Synced to Supabase).</p>
        </div>

        <button onClick={loadContacts} disabled={loading} style={styles.btnGhost}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err ? (
        <div style={styles.alert}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>Heads up</div>
          <div style={{ opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Contact</h2>

        <form onSubmit={addContact} style={styles.form}>
          <div style={styles.grid2}>
            <input
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              placeholder="First name"
              style={styles.input}
            />
            <input
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              placeholder="Last name"
              style={styles.input}
            />
          </div>

          <div style={styles.grid2}>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              style={styles.input}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={saving} style={styles.btnPrimary}>
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={styles.h2}>
          Your Contacts {loading ? "(loading...)" : `(${contacts.length})`}
        </h2>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : contacts.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No contacts yet. Add your first one above.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {contacts.map((c) => {
              const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
              return (
                <div key={c.id} style={styles.listItem}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dashboard/contacts/${c.id}`} style={styles.nameLink}>
                      {name}
                    </Link>
                    <div style={styles.meta}>
                      {c.email ? `Email: ${c.email}` : null}
                      {c.email && c.phone ? " • " : null}
                      {c.phone ? `Phone: ${c.phone}` : null}
                    </div>
                  </div>

                  <button onClick={() => deleteContact(c.id)} style={styles.btnDanger}>
                    Delete
                  </button>
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
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

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
  },

  listItem: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  nameLink: {
    color: "white",
    fontWeight: 950,
    fontSize: 16,
    textDecoration: "none",
  },
  meta: { opacity: 0.75, marginTop: 4, fontSize: 13 },

  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#1a0f0f",
    border: "1px solid #5a1f1f",
    color: "#ffd6d6",
  },
};
