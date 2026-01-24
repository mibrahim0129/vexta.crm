"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      const e = data?.session?.user?.email || "";
      setEmail(e);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/contacts", label: "Contacts" },
    { href: "/dashboard/deals", label: "Deals" },
    { href: "/dashboard/notes", label: "Notes" },
  ];

  return (
    <div style={styles.shell}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logo}>V</div>
          <div>
            <div style={styles.brandName}>Vexta</div>
            <div style={styles.brandSub}>CRM Dashboard</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userBlock}>
            <div style={styles.userDot} />
            <div style={{ minWidth: 0 }}>
              <div style={styles.userLabel}>Signed in</div>
              <div style={styles.userEmail} title={email}>
                {email || "Loading..."}
              </div>
            </div>
          </div>

          <div style={styles.sideHint}>
            Tip: Use Contacts → Deals → Notes for your workflow.
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={styles.main}>
        {/* TOP BAR */}
        <div style={styles.topbar}>
          <div />
          <div style={styles.topbarRight}>
            <Link href="/dashboard/settings" style={styles.topBtn}>
              Settings
            </Link>
            <button onClick={logout} style={{ ...styles.topBtn, ...styles.topBtnDanger }}>
              Logout
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "white",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
  },

  sidebar: {
    borderRight: "1px solid #1f1f1f",
    background: "#0f0f0f",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#111",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  brandName: { fontWeight: 950, fontSize: 16, lineHeight: 1.1 },
  brandSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  nav: { display: "grid", gap: 8, marginTop: 6 },
  navItem: {
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "white",
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
    fontWeight: 850,
    opacity: 0.9,
  },
  navItemActive: {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    opacity: 1,
  },

  sidebarBottom: { marginTop: "auto", display: "grid", gap: 10 },
  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#111",
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(34,197,94,0.9)",
    boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
  },
  userLabel: { fontSize: 12, opacity: 0.7 },
  userEmail: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.92,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 170,
  },

  sideHint: {
    fontSize: 12,
    opacity: 0.65,
    lineHeight: 1.4,
    padding: 10,
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
  },

  main: { display: "flex", flexDirection: "column" },

  topbar: {
    height: 60,
    borderBottom: "1px solid #1f1f1f",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    background: "rgba(11,11,11,0.85)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  topbarRight: { display: "flex", gap: 10 },

  topBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    fontSize: 13,
  },
  topBtnDanger: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
  },

  content: { padding: 18 },
};
