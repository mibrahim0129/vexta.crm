"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DashboardHome() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;

      if (!user) {
        window.location.href = "/login?next=/dashboard";
        return;
      }

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")?.[0] ||
        "";

      setName(fullName);
      setEmail(user.email || "");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={styles.hero}>
        <div>
          <h1 style={styles.h1}>
            {loading ? "Loading..." : `Welcome back${name ? `, ${name}` : ""} 👋`}
          </h1>
          <p style={styles.sub}>
            {loading ? "Checking your session..." : `Signed in as ${email}`}
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <Card
          title="Contacts"
          desc="Add people and organize your pipeline."
          href="/dashboard/contacts"
        />
        <Card
          title="Deals"
          desc="Track opportunities and deal stages."
          href="/dashboard/deals"
        />
        <Card
          title="Notes"
          desc="Log follow-ups and important details."
          href="/dashboard/notes"
        />
        <Card
          title="Settings"
          desc="Manage your profile and preferences."
          href="/dashboard/settings"
        />
      </div>
    </div>
  );
}

function Card({ title, desc, href }) {
  return (
    <a href={href} style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardDesc}>{desc}</div>
      <div style={styles.cardLink}>Open →</div>
    </a>
  );
}

const styles = {
  hero: {
    border: "1px solid #242424",
    background: "#111111",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  h1: { margin: 0, fontSize: 30, fontWeight: 950, letterSpacing: -0.6 },
  sub: { marginTop: 6, opacity: 0.75 },

  grid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  card: {
    textDecoration: "none",
    color: "white",
    border: "1px solid #242424",
    background: "#111111",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 8,
  },
  cardTitle: { fontWeight: 950, fontSize: 18 },
  cardDesc: { opacity: 0.75, lineHeight: 1.4 },
  cardLink: { marginTop: 4, fontWeight: 900, opacity: 0.9 },
};
