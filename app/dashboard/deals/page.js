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

export default function DealsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const mountedRef = useRef(false);

  // ✅ Subscription (soft gating)
  const { loading: subLoading, access, plan } = useSubscription();
  const canWrite = !subLoading && access; // gate create + updates

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

  // Inline edits keyed by deal_id
  const [editMap, setEditMap] = useState({}); // { [id]: { title, value } }
  const [savingId, setSavingId] = useState(""); // deal_id being saved

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

    setErr("");
    setLoading(true);

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

      // prime editMap
      const m = {};
      for (const d of list) {
        m[d.id] = { title: d.title || "", value: String(d.value ?? 0) };
      }
      setEditMap(m);
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

    // ✅ Soft gating
    if (!canWrite) {
      setErr("Upgrade required to add new deals.");
      return;
    }

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

      setDeals((prev) => [data, ...prev]);
      setEditMap((p) => ({
        ...p,
        [data.id]: { title: data.title || "", value: String(data.value ?? 0) },
      }));
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

    // ✅ Soft gating
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

    // ✅ Soft gating
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

  const filteredDeals = filterStatus === "all" ? deals : deals.filter((d) => d.status === filterStatus);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Deals</h1>
          <p style={styles.sub}>
            Realtime: <span style={styles.badge}>{rtStatus}</span>
            {" "}
            <span style={{ opacity: 0.85 }}>
              {subLoading ? " • Checking plan…" : ` • Plan: ${plan || "Free"}`}
            </span>
          </p>
        </div>

        <div style={styles.headerRight}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectSmall}>
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

      {/* ✅ Upgrade banner */}
      {!subLoading && !access ? (
        <div style={{ marginTop: 14 }}>
          <UpgradeBanner
            title="Upgrade to create & edit deals"
            body="You can view your deals, but creating or editing deals requires an active plan."
          />
        </div>
      ) : null}

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.card}>
        <h2 style={styles.h2}>Add Deal</h2>

        <form onSubmit={addDeal} style={styles.form}>
          <div style={styles.grid2}>
            <select
              value={form.contact_id}
              onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              style={styles.select}
              disabled={!canWrite || saving}
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
              disabled={!canWrite || saving}
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
            placeholder="Deal title"
            style={styles.input}
            disabled={!canWrite || saving}
          />

          <div style={styles.grid2}>
            <input
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
              placeholder="Value ($)"
              style={styles.input}
              disabled={!canWrite || saving}
            />

            <button
              type="submit"
              disabled={!canWrite || saving || contacts.length === 0}
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
              {subLoading ? "Checking plan…" : saving ? "Saving..." : "Add Deal"}
            </button>
          </div>

          {!subLoading && !access ? (
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Creating & editing deals is disabled until you upgrade.
            </div>
          ) : null}

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
          <div style={{ opacity: 0.75 }}>No deals yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {filteredDeals.map((d) => {
              const c = d.contacts;
              const contactName = c
                ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"
                : "No contact";

              const edit = editMap[d.id] || { title: d.title || "", value: String(d.value ?? 0) };

              return (
                <div key={d.id} style={styles.listItem}>
                  <div style={{ minWidth: 0, width: "100%" }}>
                    <div style={styles.rowTop}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.7 }}>Contact</div>
                        {c ? (
                          <Link href={`/dashboard/contacts/${d.contact_id}`} style={styles.link}>
                            {contactName}
                          </Link>
                        ) : (
                          <div style={{ fontWeight: 900 }}>{contactName}</div>
                        )}
                      </div>

                      <button onClick={() => deleteDeal(d.id)} style={styles.btnDanger}>
                        Delete
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      <div style={styles.grid2}>
                        <input
                          value={edit.title}
                          onChange={(e) =>
                            setEditMap((p) => ({ ...p, [d.id]: { ...edit, title: e.target.value } }))
                          }
                          style={styles.input}
                          placeholder="Deal title"
                          disabled={!canWrite}
                        />
                        <input
                          value={edit.value}
                          onChange={(e) =>
                            setEditMap((p) => ({ ...p, [d.id]: { ...edit, value: e.target.value } }))
                          }
                          style={styles.input}
                          placeholder="Value ($)"
                          disabled={!canWrite}
                        />
                      </div>

                      <div style={styles.rowBottom}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 900 }}>Status</div>
                          <select
                            value={d.status}
                            onChange={(e) => updateDealStatus(d.id, e.target.value)}
                            style={{
                              ...styles.selectInline,
                              ...( !canWrite ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                            }}
                            disabled={!canWrite}
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => saveDealDetails(d.id)}
                          disabled={!canWrite || savingId === d.id}
                          style={{
                            ...styles.btnPrimarySmall,
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
                          {!canWrite ? "Upgrade" : savingId === d.id ? "Saving..." : "Save"}
                        </button>
                      </div>
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

  btnPrimarySmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #f5f5f5",
    background: "#f5f5f5",
    color: "#0b0b0b",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 13,
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
    gap: 10,
  },

  rowTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  rowBottom: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },

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
