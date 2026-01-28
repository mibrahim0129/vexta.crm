// app/dashboard/layout.js
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");

  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let unsubscribeAuth = null;

    async function checkSubscription(userId) {
      try {
        const { data: subRow, error } = await sb
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          // If we can't read subscriptions, fail closed: push to pricing
          router.replace("/pricing");
          return;
        }

        const status = subRow?.status || "";
        const hasAccess = status === "trialing" || status === "active";

        if (!hasAccess) {
          router.replace("/pricing");
          return;
        }

        setAccessReady(true);
      } catch {
        if (!alive) return;
        router.replace("/pricing");
      }
    }

    async function boot() {
      // 1) Quick check
      const { data } = await sb.auth.getSession();
      if (!alive) return;

      if (data?.session) {
        const session = data.session;
        setEmail(session.user?.email || "");
        setAuthReady(true);
        await checkSubscription(session.user.id);
        return;
      }

      // 2) Listen (OAuth callback may still be finalizing session storage)
      const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
        if (!alive) return;

        setEmail(session?.user?.email || "");

        if (session) {
          setAuthReady(true);
          await checkSubscription(session.user.id);
          return;
        }

        // Logged out -> go login
        const next = pathname ? pathname : "/dashboard";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      });

      unsubscribeAuth = () => sub?.subscription?.unsubscribe?.();

      // 3) Re-check after a short delay; only then redirect if still no session
      setTimeout(async () => {
        if (!alive) return;

        const { data: again } = await sb.auth.getSession();
        if (again?.session) {
          const session = again.session;
          setEmail(session.user?.email || "");
          setAuthReady(true);
          await checkSubscription(session.user.id);
          return;
        }

        const next = pathname ? pathname : "/dashboard";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }, 400);
    }

    boot();

    return () => {
      alive = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/contacts", label: "Contacts" },
    { href: "/dashboard/deals", label: "Deals" },
    { href: "/dashboard/notes", label: "Notes" },
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/calendar", label: "Calendar" },
  ];

  const filteredNav = nav.filter((n) =>
    n.label.toLowerCase().includes(q.trim().toLowerCase())
  );

  // ✅ block UI until auth + subscription access are confirmed
  if (!authReady || !accessReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "white",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ fontWeight: 950, opacity: 0.9 }}>
          {authReady ? "Checking access…" : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <aside
        style={{
          ...styles.sidebar,
          width: collapsed ? 84 : 260,
          transition: "width 180ms ease",
        }}
      >
        <div style={styles.brand}>
          <div style={styles.logo}>V</div>
          {!collapsed ? (
            <div style={{ minWidth: 0 }}>
              <div style={styles.brandName}>Vexta</div>
              <div style={styles.brandSub}>CRM Dashboard</div>
            </div>
          ) : null}

          <button
            onClick={() => setCollapsed((v) => !v)}
            style={styles.collapseBtn}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <div style={styles.searchWrap}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={collapsed ? "Search…" : "Search pages…"}
            style={styles.search}
          />
        </div>

        <nav style={styles.nav}>
          {(q.trim() ? filteredNav : nav).map((item) => {
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
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                title={collapsed ? item.label : undefined}
              >
                {!collapsed ? item.label : item.label[0]}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userBlock}>
            <div style={styles.userDot} />
            {!collapsed ? (
              <div style={{ minWidth: 0 }}>
                <div style={styles.userLabel}>Signed in</div>
                <div style={styles.userEmail} title={email}>
                  {email || "Loading..."}
                </div>
              </div>
            ) : null}
          </div>

          {!collapsed ? (
            <div style={styles.sideHint}>
              Tip: Open a contact → manage everything from one place.
            </div>
          ) : null}
        </div>
      </aside>

      <div style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.breadcrumb}>
              {pathname?.replace("/dashboard", "Dashboard") || "Dashboard"}
            </div>
          </div>

          <div style={styles.topbarRight}>
            <Link href="/dashboard/settings" style={styles.topBtn}>
              Settings
            </Link>
            <button
              onClick={logout}
              style={{ ...styles.topBtn, ...styles.topBtnDanger }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.container}>{children}</div>
        </div>
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
    gridTemplateColumns: "auto 1fr",
  },
  sidebar: {
    borderRight: "1px solid #1f1f1f",
    background: "#0f0f0f",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#111",
    position: "relative",
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
    flexShrink: 0,
  },
  brandName: { fontWeight: 950, fontSize: 16, lineHeight: 1.1 },
  brandSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  collapseBtn: {
    marginLeft: "auto",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    padding: "6px 10px",
  },
  searchWrap: {
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
    padding: 10,
  },
  search: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    fontWeight: 800,
    fontSize: 13,
  },
  nav: { display: "grid", gap: 8, marginTop: 2 },
  navItem: {
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "white",
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
    fontWeight: 900,
    opacity: 0.9,
    display: "flex",
    alignItems: "center",
    gap: 10,
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
    flexShrink: 0,
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
  topbarLeft: { display: "flex", alignItems: "center", gap: 10 },
  breadcrumb: { fontWeight: 950, opacity: 0.9 },
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
  container: { maxWidth: 1100, margin: "0 auto", width: "100%" },
};
