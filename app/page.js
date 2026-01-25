"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function StartupPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [msg, setMsg] = useState("Checking session…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        const session = data?.session;

        if (cancelled) return;

        if (session) {
          setMsg("Welcome back… loading dashboard");
          window.location.href = "/dashboard";
        } else {
          setMsg("Loading login…");
          window.location.href = "/login";
        }
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setMsg("Loading login…");
        window.location.href = "/login";
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>V</div>
        <div style={styles.title}>Vexta CRM</div>
        <div style={styles.sub}>{msg}</div>
        <div style={styles.bar}>
          <div style={styles.barFill} />
        </div>
        <div style={styles.small}>Startup screen → login/dashboard</div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at top, rgba(255,255,255,0.08), rgba(0,0,0,1))",
    color: "white",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.55)",
    padding: 22,
    boxShadow: "0 12px 50px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
    textAlign: "center",
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    margin: "0 auto 10px",
    fontWeight: 950,
    fontSize: 22,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  title: { fontSize: 28, fontWeight: 950, letterSpacing: -0.6 },
  sub: { marginTop: 10, opacity: 0.8, fontWeight: 800 },
  bar: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  barFill: {
    width: "60%",
    height: "100%",
    background: "rgba(255,255,255,0.65)",
    animation: "vextaSlide 1.2s infinite ease-in-out",
  },
  small: { marginTop: 12, fontSize: 12, opacity: 0.65 },
};
