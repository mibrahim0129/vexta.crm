"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={styles.page}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h1 style={styles.h1}>Login</h1>
        <p style={styles.p}>Sign in to your CRM dashboard.</p>

        <label style={styles.label}>
          <span style={styles.labelText}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="you@email.com"
            required
          />
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
            type="password"
            required
          />
        </label>

        {error ? <div style={styles.error}>{error}</div> : null}

        <button disabled={loading} style={styles.btn}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div style={styles.hint}>
          For now we’ll use a single owner account, then we’ll upgrade to full accounts.
        </div>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 18,
    padding: 18,
  },
  h1: { margin: 0, fontSize: 28 },
  p: { margin: "8px 0 16px", opacity: 0.75 },
  label: { display: "grid", gap: 6, marginBottom: 12 },
  labelText: { fontSize: 12, opacity: 0.75 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "white",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },
  error: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.5)",
    background: "rgba(239,68,68,0.12)",
    color: "#ef4444",
    fontWeight: 700,
  },
  hint: { marginTop: 12, opacity: 0.7, fontSize: 12, lineHeight: 1.4 },
};
