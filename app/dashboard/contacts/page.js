"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Soft gating imports
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function contactName(c) {
  return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
}

function initialsFromContact(c) {
  const a = (c?.first_name || " ")[0] || "";
  const b = (c?.last_name || " ")[0] || "";
  const inits = `${a}${b}`.trim().toUpperCase();
  return inits || "C";
}

export default function ContactsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();
  const canCreate = !subLoading && !!access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [contacts, setContacts] = useState([]);

  // Responsive UI
  const [isMobile, setIsMobile] = useState(false);

  // UI filters
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // new | old | name

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

    // ✅ Soft gating: block create, but still allow viewing
    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canCreate) {
      setErr("Upgrade required to add new contacts.");
      return;
    }

    const first = (form.first_name || "").trim();
    const last = (form.last_name || "").trim();
    const email = (form.email || "").trim();
    const phone = (form.phone || "").trim();

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
            email: email || null,
            phone: phone || null,
          },
        ])
        .select("id, first_name, last_name, email, phone, created_at")
        .single();

      if (error) throw error;

      setContacts((prev) => [data, ...prev]);
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id, name) {
    setErr("");

    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canCreate) {
      setErr("Upgrade required to delete contacts.");
      return;
    }

    const ok = confirm(`Delete "${name || "this contact"}"? This may also remove related notes/tasks.`);
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

    const channel = sb
      .channel("contacts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => loadContacts())
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = normalize(query);

  const filtered = contacts.filter((c) => {
    if (!q) return true;
    const name = contactName(c);
    const hay = `${name} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
    return hay.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "old") return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    if (sort === "name") {
      const an = normalize(`${a.last_name || ""} ${a.first_name || ""}`) || "zzz";
      const bn = normalize(`${b.last_name || ""} ${b.first_name || ""}`) || "zzz";
      return an.localeCompare(bn);
    }
    // new (default)
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  const disableWrites = subLoading || !canCreate;

  const grid2 = isMobile ? styles.grid1 : styles.grid2;
  const listGrid = isMobile ? styles.listGrid1 : styles.listGrid2;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.h1}>Contacts</h1>

            <span style={styles.pill}>{subLoading ? "Checking plan…" : `Plan: ${plan || "Free"}`}</span>
            <span style={styles.pillMuted}>{loading ? "Loading…" : `${sorted.length} shown`}</span>
          </div>

          <p style={styles.sub}>
            Store clients, leads, and prospects — then open a contact to manage everything in one place.
          </p>
        </div>

        <div style={styles.headerRight}>
          <button onClick={loadContacts} disabled={loading} style={styles.btnGhost} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <Link href="/dashboard/contacts/import" style={styles.btnGhostLink}>
            Import →
          </Link>
        </div>
      </div>

      {/* Upgrade banner */}
      {!subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to add contacts"
            body="You can still view your existing contacts, but creating and deleting contacts requires an active plan."
          />
        </div>
      ) : null}

      {err ? (
        <div style={styles.alert}>
          <div style={{ fontWeight: 950, marginBottom: 4 }}>Heads up</div>
          <div style={{ opacity: 0.95 }}>{err}</div>
        </div>
      ) : null}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchWrap}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            style={styles.search}
          />
          {query.trim() ? (
            <button onClick={() => setQuery("")} style={styles.clearBtn} type="button" title="Clear">
              ✕
            </button>
          ) : null}
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.selectSmall}>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Add Contact */}
      <div style={styles.card}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Add Contact</h2>
          {!subLoading && !access ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>Writes are disabled until upgrade.</div>
          ) : null}
        </div>

        <form onSubmit={addContact} style={styles.form}>
          <div style={grid2}>
            <input
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              placeholder="First name"
              style={styles.input}
              disabled={disableWrites || saving}
            />
            <input
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              placeholder="Last name"
              style={styles.input}
              disabled={disableWrites || saving}
            />
          </div>

          <div style={grid2}>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              style={styles.input}
              disabled={disableWrites || saving}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone"
              style={styles.input}
              disabled={disableWrites || saving}
            />
          </div>

          <div style={styles.formBottom}>
            <button
              type="submit"
              disabled={disableWrites || saving}
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
              {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Contact"}
            </button>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Tip: Keep phone/email updated — it makes follow-ups faster.
            </div>
          </div>

          {!subLoading && !access ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>Adding/deleting contacts is disabled until you upgrade.</div>
          ) : null}
        </form>
      </div>

      {/* List */}
      <div style={{ marginTop: 18 }}>
        <div style={styles.listHeader}>
          <h2 style={styles.h2}>Your Contacts</h2>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13 }}>
            {loading ? "Loading…" : `${contacts.length} total`}
          </div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : contacts.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>No contacts yet</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Add your first contact above — then open it to track deals, notes, tasks, and events.
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>No matches</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Try a different search, or clear the filter.
            </div>
          </div>
        ) : (
          <div style={listGrid}>
            {sorted.map((c) => {
              const name = contactName(c);
              const initials = initialsFromContact(c);

              return (
                <div key={c.id} style={styles.contactCard}>
                  <div style={styles.cardRow}>
                    <div style={styles.avatar} aria-hidden="true">
                      {initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <Link href={`/dashboard/contacts/${c.id}`} style={styles.nameLink}>
                        {name}
                      </Link>

                      <div style={styles.metaLine}>
                        {c.email ? <span style={styles.metaChip}>✉ {c.email}</span> : null}
                        {c.phone ? <span style={styles.metaChip}>☎ {c.phone}</span> : null}
                      </div>
                    </div>

                    <div style={styles.actions}>
                      <Link href={`/dashboard/contacts/${c.id}`} style={styles.btnMini}>
                        Open
                      </Link>
                      <button
                        onClick={() => deleteContact(c.id, name)}
                        style={{
                          ...styles.btnMini,
                          ...styles.btnMiniDanger,
                          ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                        }}
                        disabled={disableWrites}
                        type="button"
                        title={disableWrites ? "Upgrade required" : "Delete contact"}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <span style={{ opacity: 0.7 }}>
                      Added: {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </span>
                    <span style={styles.footerHint}>Open to manage everything.</span>
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
  btnGhostLink: {
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

  searchWrap: {
    flex: "1 1 280px",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  search: {
    width: "100%",
    padding: "11px 40px 11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },
  clearBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 950,
    lineHeight: 1,
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
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: 10 },

  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
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

  listGrid2: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  listGrid1: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12 },

  contactCard: {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  },

  cardRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.10)",
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    flexShrink: 0,
  },

  nameLink: {
    color: "white",
    fontWeight: 950,
    fontSize: 16,
    textDecoration: "none",
    letterSpacing: -0.2,
  },

  metaLine: { marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12,
    fontWeight: 850,
    opacity: 0.95,
    whiteSpace: "nowrap",
  },

  actions: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },

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

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  footerHint: { opacity: 0.65, fontWeight: 800 },
};
