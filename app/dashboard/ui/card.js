"use client";

import { useEffect, useMemo, useState } from "react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("buyer");

  // Search + filter
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Preference: rows vs cards (local)
  const [view, setView] = useState("rows"); // "rows" | "cards"

  // Hover id (for showing trash button only on hover)
  const [hoverId, setHoverId] = useState(null);

  async function loadContacts() {
    setLoading(true);
    const res = await fetch("/api/contacts", { cache: "no-store" });
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }

  useEffect(() => {
    loadContacts();

    const savedView = localStorage.getItem("contacts:view");
    if (savedView === "rows" || savedView === "cards") setView(savedView);

    const handler = () => loadContacts();
    window.addEventListener("contacts:changed", handler);
    return () => window.removeEventListener("contacts:changed", handler);
  }, []);

  useEffect(() => {
    localStorage.setItem("contacts:view", view);
  }, [view]);

  async function addContact(e) {
    e.preventDefault();

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, type }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed to add contact");
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setType("buyer");

    loadContacts();
    window.dispatchEvent(new Event("contacts:changed"));
  }

  async function deleteContact(id) {
    const ok = window.confirm("Delete this contact? This cannot be undone.");
    if (!ok) return;

    const res = await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed to delete");
      return;
    }

    loadContacts();
    window.dispatchEvent(new Event("contacts:changed"));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return contacts
      .filter((c) => {
        if (filterType === "all") return true;
        return String(c.type || "").toLowerCase() === filterType;
      })
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.name || ""} ${c.phone || ""} ${c.email || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [contacts, query, filterType]);

  const hasAnyContacts = contacts.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <main style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Contacts</h1>
          <p style={styles.subtext}>
            Add, search, and manage your database. Click a name to view details.
          </p>
        </div>

        <div style={styles.headerRight}>
          <span style={styles.badge}>{contacts.length} total</span>

          <div style={styles.toggleWrap}>
            <button
              onClick={() => setView("rows")}
              style={{
                ...styles.toggleBtn,
                background: view === "rows" ? "white" : "transparent",
                color: view === "rows" ? "black" : "white",
              }}
            >
              Rows
            </button>

            <button
              onClick={() => setView("cards")}
              style={{
                ...styles.toggleBtn,
                background: view === "cards" ? "white" : "transparent",
                color: view === "cards" ? "black" : "white",
              }}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left: Add Contact */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Add Contact</h2>
          </div>

          <form onSubmit={addContact} style={styles.form}>
            <label style={styles.label}>
              <span style={styles.labelText}>Full name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Doe"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="708-000-0000"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@email.com"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="tenant">Tenant</option>
                <option value="landlord">Landlord</option>
              </select>
            </label>

            <button type="submit" style={styles.primaryBtn}>
              Add Contact
            </button>
          </form>

          <div style={styles.tipBox}>
            <div style={styles.tipTitle}>Next up</div>
            <div style={styles.tipText}>
              After this, we can add notes to a contact (calls, showings, follow-ups).
            </div>
          </div>
        </section>

        {/* Right: Saved Contacts */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Saved Contacts</h2>
          </div>

          <div style={styles.searchRow}>
            <input
              placeholder="Search name, phone, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...styles.input, flex: 1 }}
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ ...styles.input, width: 160 }}
            >
              <option value="all">All</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="tenant">Tenant</option>
              <option value="landlord">Landlord</option>
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            {loading ? (
              <div style={styles.empty}>Loading…</div>
            ) : !hasAnyContacts ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyTitle}>No contacts yet</div>
                <div style={styles.emptyText}>Add your first contact on the left.</div>
              </div>
            ) : !hasResults ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyTitle}>No results</div>
                <div style={styles.emptyText}>Try a different search or filter.</div>
                <button
                  onClick={() => {
                    setQuery("");
                    setFilterType("all");
                  }}
                  style={styles.secondaryBtn}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div style={view === "cards" ? styles.cardGrid : styles.list}>
                {filtered.map((c) =>
                  view === "cards" ? (
                    <div
                      key={c.id}
                      style={styles.cardItem}
                      onMouseEnter={(e) => {
                        setHoverId(c.id);
                        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                      }}
                      onMouseLeave={(e) => {
                        setHoverId(null);
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                    >
                      <div style={styles.cardTopRow}>
                        <a href={`/dashboard/contacts/${c.id}`} style={styles.nameLink}>
                          {c.name}
                        </a>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteContact(c.id);
                          }}
                          style={{
                            ...styles.iconDangerBtn,
                            opacity: hoverId === c.id ? 1 : 0,
                            pointerEvents: hoverId === c.id ? "auto" : "none",
                            transform: hoverId === c.id ? "scale(1)" : "scale(0.98)",
                          }}
                          title="Delete"
                          aria-label="Delete contact"
                        >
                          🗑️
                        </button>
                      </div>

                      <div style={styles.meta}>
                        <span style={styles.pill}>{c.type}</span>
                        {c.phone ? <span style={styles.metaText}>{c.phone}</span> : null}
                        {c.email ? <span style={styles.metaText}>{c.email}</span> : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={c.id}
                      style={styles.row}
                      onMouseEnter={(e) => {
                        setHoverId(c.id);
                        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                      }}
                      onMouseLeave={(e) => {
                        setHoverId(null);
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <a href={`/dashboard/contacts/${c.id}`} style={styles.nameLink}>
                          {c.name}
                        </a>

                        <div style={styles.meta}>
                          <span style={styles.pill}>{c.type}</span>
                          {c.phone ? <span style={styles.metaText}>{c.phone}</span> : null}
                          {c.email ? <span style={styles.metaText}>{c.email}</span> : null}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteContact(c.id);
                        }}
                        style={{
                          ...styles.iconDangerBtn,
                          opacity: hoverId === c.id ? 1 : 0,
                          pointerEvents: hoverId === c.id ? "auto" : "none",
                          transform: hoverId === c.id ? "scale(1)" : "scale(0.98)",
                        }}
                        title="Delete"
                        aria-label="Delete contact"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    padding: 40,
    maxWidth: 1100,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  toggleWrap: {
    display: "flex",
    gap: 8,
  },
  h1: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.5,
  },
  h2: {
    margin: 0,
    fontSize: 18,
  },
  subtext: {
    margin: "8px 0 0",
    opacity: 0.7,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.6fr",
    gap: 16,
    alignItems: "start",
  },
  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  badge: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    opacity: 0.85,
  },
  form: {
    display: "grid",
    gap: 10,
    marginTop: 8,
  },
  label: {
    display: "grid",
    gap: 6,
  },
  labelText: {
    fontSize: 12,
    opacity: 0.75,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  primaryBtn: {
    marginTop: 6,
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "white",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryBtn: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  toggleBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  tipBox: {
    marginTop: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    padding: 12,
  },
  tipTitle: {
    fontWeight: 900,
    marginBottom: 6,
  },
  tipText: {
    opacity: 0.8,
    lineHeight: 1.4,
  },
  searchRow: {
    display: "flex",
    gap: 10,
    marginTop: 8,
  },
  list: {
    display: "grid",
    gap: 10,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    transition: "background 160ms ease",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  cardItem: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    transition: "background 160ms ease",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  nameLink: {
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
    display: "inline-block",
    maxWidth: 520,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    marginTop: 6,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    opacity: 0.9,
  },
  pill: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
  },
  metaText: {
    fontSize: 13,
    opacity: 0.85,
  },
  iconDangerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.65)",
    background: "rgba(239,68,68,0.08)",
    color: "#ef4444",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    transition: "opacity 160ms ease, transform 160ms ease",
    flexShrink: 0,
  },
  empty: {
    opacity: 0.75,
    padding: 10,
  },
  emptyBox: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
  },
  emptyTitle: {
    fontWeight: 900,
    marginBottom: 6,
  },
  emptyText: {
    opacity: 0.8,
    lineHeight: 1.4,
  },
};
