"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Soft gating
import { useSubscription } from "@/lib/subscription/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

const STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "closed", label: "Closed" },
];

function statusLabel(v) {
  return STATUSES.find((s) => s.value === v)?.label || "Unknown";
}

function money(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "$0";
  return `$${num.toLocaleString()}`;
}

export default function DealsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();
  const canWrite = !subLoading && !!access;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(""); // deal_id being saved
  const [err, setErr] = useState("");
  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);

  // UI filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // new | old | value_desc | value_asc | title

  const [form, setForm] = useState({
    contact_id: "",
    title: "",
    status: "lead",
    value: "",
  });

  // Inline edits keyed by deal_id
  const [editMap, setEditMap] = useState({}); // { [id]: { title, value } }

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      window.location.href = "/login?next=/dashboard/deals";
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

    if (!form.contact_id && list.length > 0) {
      setForm((p) => ({ ...p, contact_id: list[0].id }));
    }
  }

  async function loadDeals() {
    const session = await requireSession();
    if (!session) return;

    try {
      const { data, error } = await sb
        .from("deals")
        .select(
          `
          id,
          title,
          status,
          value,
          contact_id,
          created_at,
          contacts:contact_id ( id, first_name, last_name )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      setDeals(list);

      const m = {};
      for (const d of list) {
        m[d.id] = { title: d.title || "", value: String(d.value ?? 0) };
      }
      setEditMap(m);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load deals");
      setDeals([]);
    }
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const session = await requireSession();
      if (!session) return;

      await Promise.all([loadContacts(), loadDeals()]);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function addDeal(e) {
    e.preventDefault();
    setErr("");

    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canWrite) {
      setErr("Upgrade required to add new deals.");
      return;
    }

    const title = (form.title || "").trim();
    if (!title) {
      setErr("Deal title is required.");
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

      const valueNum = form.value === "" ? 0 : Number(form.value);
      const safeValue = Number.isFinite(valueNum) ? valueNum : 0;

      const { data, error } = await sb
        .from("deals")
        .insert([
          {
            user_id: session.user.id,
            contact_id: form.contact_id,
            title,
            status: form.status,
            value: safeValue,
          },
        ])
        .select(
          `
          id,
          title,
          status,
          value,
          contact_id,
          created_at,
          contacts:contact_id ( id, first_name, last_name )
        `
        )
        .single();

      if (error) throw error;

      setDeals((prev) => [data, ...prev]);
      setEditMap((p) => ({
        ...p,
        [data.id]: { title: data.title || "", value: String(data.value ?? 0) },
      }));
      setForm((p) => ({ ...p, title: "", status: "lead", value: "" }));
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Failed to add deal");
    } finally {
      setSaving(false);
    }
  }

  async function updateDealStatus(dealId, newStatus) {
    setErr("");

    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canWrite) {
      setErr("Upgrade required to update deals.");
      return;
    }

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("deals").update({ status: newStatus }).eq("id", dealId);
      if (error) throw error;

      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d)));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update deal");
    }
  }

  async function saveDealDetails(dealId) {
    setErr("");

    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canWrite) {
      setErr("Upgrade required to edit deals.");
      return;
    }

    setSavingId(dealId);

    try {
      const session = await requireSession();
      if (!session) return;

      const cur = editMap[dealId] || { title: "", value: "0" };
      const title = String(cur.title || "").trim();
      if (!title) {
        setErr("Deal title can’t be empty.");
        return;
      }

      const valueNum = cur.value === "" ? 0 : Number(cur.value);
      const safeValue = Number.isFinite(valueNum) ? valueNum : 0;

      const { error } = await sb.from("deals").update({ title, value: safeValue }).eq("id", dealId);
      if (error) throw error;

      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, title, value: safeValue } : d)));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to save deal");
    } finally {
      setSavingId("");
    }
  }

  async function deleteDeal(dealId, title) {
    setErr("");

    if (subLoading) {
      setErr("Checking your plan… please try again.");
      return;
    }
    if (!canWrite) {
      setErr("Upgrade required to delete deals.");
      return;
    }

    const ok = confirm(`Delete "${title || "this deal"}"?`);
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("deals").delete().eq("id", dealId);
      if (error) throw error;

      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      setEditMap((p) => {
        const copy = { ...p };
        delete copy[dealId];
        return copy;
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete deal");
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      const channel = sb.channel("deals-rt");
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadDeals();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
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

  const normalizedQuery = String(query || "").trim().toLowerCase();

  const filtered = deals
    .filter((d) => (filterStatus === "all" ? true : d.status === filterStatus))
    .filter((d) => {
      if (!normalizedQuery) return true;
      const c = d.contacts;
      const contactName = c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : "";
      const hay = `${d.title || ""} ${contactName}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "old") return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    if (sort === "value_desc") return Number(b.value || 0) - Number(a.value || 0);
    if (sort === "value_asc") return Number(a.value || 0) - Number(b.value || 0);
    if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    // new
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  const disableWrites = subLoading || !canWrite;

  return (
    <div>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.h1}>Deals</h1>
            <span style={styles.pill}>Realtime: {rtStatus}</span>
            <span style={styles.pillMuted}>{subLoading ? "Checking plan…" : `Plan: ${plan || "Free"}`}</span>
            <span style={styles.pillMuted}>{loading ? "Loading…" : `${sorted.length} shown`}</span>
          </div>
          <p style={styles.sub}>Track opportunities and move them through your pipeline.</p>
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
            title="Upgrade to create & edit deals"
            body="You can view your deals, but creating, editing, or deleting deals requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      {/* Controls */}
      <div style={styles.controls}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search deals or contacts…"
          style={styles.search}
        />

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectPill}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.selectPill}>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="value_desc">Value (High → Low)</option>
          <option value="value_asc">Value (Low → High)</option>
          <option value="title">Title (A → Z)</option>
        </select>
      </div>

      {/* Add Deal */}
      <div style={styles.card}>
        <div style={styles.cardTop}>
          <h2 style={styles.h2}>Add Deal</h2>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {contacts.length === 0 ? (
              <>
                Add a contact first in{" "}
                <Link href="/dashboard/contacts" style={{ color: "white", fontWeight: 900 }}>
                  Contacts
                </Link>
                .
              </>
            ) : !subLoading && !access ? (
              "Writes are disabled until upgrade."
            ) : null}
          </div>
        </div>

        <form onSubmit={addDeal} style={styles.form}>
          <div style={styles.grid2}>
            <select
              value={form.contact_id}
              onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              style={styles.select}
              disabled={disableWrites || saving}
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
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              style={styles.select}
              disabled={disableWrites || saving}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Deal title (e.g., Buyer: 3BR search)"
            style={styles.input}
            disabled={disableWrites || saving}
          />

          <div style={styles.grid2}>
            <input
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
              placeholder="Value ($)"
              style={styles.input}
              disabled={disableWrites || saving}
            />

            <button
              type="submit"
              disabled={disableWrites || saving || contacts.length === 0}
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
              {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Deal"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div style={{ marginTop: 18 }}>
        <div style={styles.listHeader}>
          <h2 style={styles.h2}>Your Deals</h2>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13 }}>
            {loading ? "Loading…" : `${deals.length} total`}
          </div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>No deals yet</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Add your first deal above — then move it through your pipeline.
            </div>
          </div>
        ) : (
          <div style={styles.listGrid}>
            {sorted.map((d) => {
              const c = d.contacts;
              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "No contact";

              const edit = editMap[d.id] || { title: d.title || "", value: String(d.value ?? 0) };

              return (
                <div key={d.id} style={styles.dealCard}>
                  <div style={styles.cardHead}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.topMeta}>
                        <span style={styles.chip}>Contact</span>
                        {c ? (
                          <Link href={`/dashboard/contacts/${d.contact_id}`} style={styles.contactLink}>
                            {contactName}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 900 }}>{contactName}</span>
                        )}
                      </div>

                      <div style={styles.titleRow2}>
                        <input
                          value={edit.title}
                          onChange={(e) =>
                            setEditMap((p) => ({ ...p, [d.id]: { ...edit, title: e.target.value } }))
                          }
                          style={styles.inputInlineTitle}
                          placeholder="Deal title"
                          disabled={disableWrites}
                        />

                        <span style={styles.valueTag}>{money(edit.value)}</span>
                      </div>
                    </div>

                    <div style={styles.actions}>
                      <Link href={`/dashboard/deals/${d.id}`} style={styles.btnMini}>
                        Open
                      </Link>
                      <button
                        onClick={() => deleteDeal(d.id, d.title)}
                        style={{
                          ...styles.btnMini,
                          ...styles.btnMiniDanger,
                          ...(disableWrites ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                        }}
                        disabled={disableWrites}
                        type="button"
                        title={disableWrites ? "Upgrade required" : "Delete deal"}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.grid2}>
                      <div>
                        <div style={styles.smallLabel}>Status</div>
                        <select
                          value={d.status}
                          onChange={(e) => updateDealStatus(d.id, e.target.value)}
                          style={styles.selectInline}
                          disabled={disableWrites}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={styles.smallLabel}>Value</div>
                        <input
                          value={edit.value}
                          onChange={(e) =>
                            setEditMap((p) => ({ ...p, [d.id]: { ...edit, value: e.target.value } }))
                          }
                          style={styles.inputInline}
                          placeholder="Value ($)"
                          disabled={disableWrites}
                        />
                      </div>
                    </div>

                    <div style={styles.cardFooter}>
                      <span style={{ opacity: 0.7 }}>
                        Added: {d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}
                      </span>

                      <button
                        onClick={() => saveDealDetails(d.id)}
                        disabled={disableWrites || savingId === d.id}
                        style={{
                          ...styles.btnPrimarySmall,
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
                        type="button"
                      >
                        {!canWrite ? "Upgrade" : savingId === d.id ? "Saving..." : "Save"}
                      </button>
                    </div>
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

  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
  },
  select: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },

  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "white",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
  },
  btnPrimarySmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "white",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 13,
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

  dealCard: {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  cardHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },

  topMeta: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
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
  },
  contactLink: { color: "white", fontWeight: 950, textDecoration: "none" },

  titleRow2: { marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  inputInlineTitle: {
    minWidth: 260,
    flex: "1 1 260px",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 950,
    letterSpacing: -0.2,
  },

  valueTag: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  actions: { display: "flex", gap: 8, alignItems: "center" },
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

  cardBody: { marginTop: 12, display: "grid", gap: 12 },

  smallLabel: { fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 },

  selectInline: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 900,
    cursor: "pointer",
  },

  inputInline: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 900,
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
  },
};
