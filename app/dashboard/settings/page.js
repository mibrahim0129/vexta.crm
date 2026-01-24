"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SettingsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      try {
        const { data, error } = await sb.auth.getUser();
        if (error) throw error;

        if (!data?.user) {
          window.location.href = "/login?next=/dashboard/settings";
          return;
        }

        setUser(data.user);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Settings</h1>
          <p style={styles.sub}>Account and app settings (we’ll expand this later).</p>
        </div>

        <button onClick={logout} style={styles.btnDanger}>
          Logout
        </button>
      </div>

      {err ? <div style={styles.alert}>{err}</div> : null}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Account</h2>

          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : !user ? (
            <div style={{ opacity: 0.75 }}>Not signed in.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <Row label="Email" value={user.email || "-"} />
              <Row label="User ID" value={user.id || "-"} />
              <Row label="Provider" value={user.app_metadata?.provider || "-"} />
              <Row
                label="Last sign-in"
                value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "-"}
              />
              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
                Your data is protected by Supabase Row Level Security (RLS). Only you can see your
                contacts, deals, and notes.
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.h2}>App</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <Row label="Theme" value="Dark" />
            <Row label="Realtime" value="Enabled" />
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
              Coming soon:
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                <li>Profile settings</li>
                <li>Team accounts</li>
                <li>Billing / subscriptions</li>
                <li>Import / export</li>
              </ul>
            </div>

            <button onClick={logout} style={styles.btnGhost}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue} title={String(value)}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h1: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.75 },

  grid: { marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  card: { padding: 16, border: "1px solid #242424", borderRadius: 16, background: "#111111" },
  h2: { margin: 0, fontSize: 18, fontWeight: 900 },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #242424",
    background: "#101010",
  },
  rowLabel: { opacity: 0.75, fontWeight: 900, fontSize: 13 },
  rowValue: {
    fontWeight: 950,
    fontSize: 13,
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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

  btnGhost: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 13,
    width: "fit-content",
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
};
