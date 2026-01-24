"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "closed", label: "Closed" },
];

export default function DealsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rtStatus, setRtStatus] = useState("connecting");

  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);

  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    contact_id: "",
    title: "",
    status: "lead",
    value: "",
  });

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

    // Set default contact if none selected
    if (!form.contact_id && list.length > 0) {
      setForm((p) => ({ ...p, contact_id: list[0].id }));
    }
  }

  async function loadDeals() {
    const session = await requireSession();
    if (!session) return;

    setErr("");
    setLoading(true);

    try {
      const query = sb
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

      const { data, error } = await query;
      if (error) throw error;

      setDeals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load deals");
      setDeals([]);
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

    const title = form.title.trim();
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

      // Optimistic insert
      setDeals((prev) => [data, ...prev]);
      setForm((p) => ({ ...p, title: "", status: "lead", value: "" }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to add deal");
    } finally {
      setSaving(false);
    }
  }

  async function updateDealStatus(dealId, newStatus) {
    setErr("");
    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("deals").update({ status: newStatus }).eq("id", dealId);
      if (error) throw error;

      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
      );
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update deal");
    }
  }

  async function deleteDeal(dealId) {
    setErr("");
    const ok = confirm("Delete this deal?");
    if (!ok) return;

    try {
      const session = await requireSession();
      if (!session) return;

      const { error } = await sb.from("deals").delete().eq("id", dealId);
      if (error) throw error;

      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete deal");
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await loadAll();

      // Realtime sync
      const channel = sb.channel("deals-rt");

      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
          if (mountedRef.current) loadDeals();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
          // contact names can change, refresh data
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

  const filteredDeals =
    filterStatus === "all" ? deals : deals.filter((d) => d.status === filterStatus);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Deals</h1>
          <p style={styles.sub}>
            Track opportunities • Realtime: <span style={styles.badge}>{rtStatus}</span>
          </p>
        </div>

        <div style={styles.headerRight}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.selectSmall}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button onClick={loadAll} disabled={loading} style={styles.btnGhost}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Deal</h2>

        <form onSubmit={addDeal} style={styles.form}>
          <div style={styles.grid2}>
            <select
              value={form.contact_id}
              onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              style={styles.select}
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
            placeholder="Deal title (ex: 123 Main St Listing)"
            style={styles.input}
          />

          <div style={styles.grid2}>
            <input
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
              placeholder="Value ($)"
              style={styles.input}
            />
            <button type="submit" disabled={saving || contacts.length === 0} style={styles.btnPrimary}>
              {saving ? "Saving..." : "Add Deal"}
            </button>
          </div>

          {contacts.length === 0 ? (
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Add a contact first in{" "}
              <Link href="/dashboard/contacts" style={{ color: "white", fontWeight: 900 }}>
                Contacts
              </Link>
              .
            </div>
          ) : null}
        </form>
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={styles.h2}>
          Your Deals {loading ? "(loading...)" : `(${filteredDeals.length})`}
        </h2>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : filteredDeals.length === 0 ? (
          <div style={{ opacity: 0.75 }}>
            No deals yet{filterStatus !== "all" ? " for this status" : ""}. Add one above.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {filteredDeals.map((d) => {
              const c = d.contacts;
              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "No contact";

              return (
                <div key={d.id} style={styles.listItem}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>{d.title}</div>

                    <div style={styles.meta}>
                      <span style={{ opacity: 0.9 }}>Contact:</span>{" "}
                      {c ? (
                        <Link href={`/dashboard/contacts/${d.contact_id}`} style={styles.link}>
                          {contactName}
                        </Link>
                      ) : (
                        <span>{contactName}</span>
                      )}
                      {" • "}
                      <span style={{ opacity: 0.9 }}>Value:</span> $
                      {Number(d.value || 0).toLocaleString()}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 900 }}>Status</div>
                      <select
                        value={d.status}
                        onChange={(e) => updateDealStatus(d.id, e.target.value)}
                        style={styles.selectInline}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button onClick={() => deleteDeal(d.id)} style={styles.btnDanger}>
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

  selectInline: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    color: "white",
    outline: "none",
    fontWeight: 900,
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

  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #f5f5f5",
    background: "#f5f5f5",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
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

  listItem: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #242424",
    background: "#111111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  meta: { opacity: 0.75, marginTop: 6, fontSize: 13, lineHeight: 1.4 },

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
