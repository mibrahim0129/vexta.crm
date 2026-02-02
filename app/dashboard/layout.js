"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// NOTE: kept for backward compatibility (not relied on anymore for gating)
function isAllowedEmail(email) {
  const e = (email || "").toLowerCase();
  const allow = parseCsv(process.env.NEXT_PUBLIC_BETA_ALLOWLIST);
  const admins = parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS);
  return admins.includes(e) || allow.includes(e);
}

// ✅ Runtime check (server truth)
function isAllowedEmailFromLists(email, allowlist, admins) {
  const e = (email || "").toLowerCase();
  if (!e) return false;
  return (admins || []).includes(e) || (allowlist || []).includes(e);
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");

  const [authReady, setAuthReady] = useState(false);
  const [gateError, setGateError] = useState("");

  // ✅ Mobile support
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cache runtime config in-memory for this tab
  const betaCfgRef = useRef({ ready: false, betaOpen: false, allowlist: [], admins: [] });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (!isMobile) return;
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileOpen]);

  // ESC closes drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    let alive = true;
    let unsubscribeAuth = null;
    let kicked = false;

    async function kickToBetaClosed(message) {
      if (kicked) return;
      kicked = true;

      try {
        setGateError(message || "You are not on the beta allowlist.");
        setAuthReady(false);

        // Hard kick: sign out so they can't "stick" in the dashboard after OAuth
        await sb.auth.signOut();
      } catch {
        // ignore
      } finally {
        // Use replace so back button doesn't re-enter dashboard
        router.replace("/beta-closed");
      }
    }

    async function loadBetaConfig() {
      if (betaCfgRef.current.ready) return betaCfgRef.current;

      const res = await fetch("/api/beta-config", { cache: "no-store" });
      const json = await res.json();

      betaCfgRef.current = {
        ready: true,
        betaOpen: !!json?.betaOpen,
        allowlist: Array.isArray(json?.allowlist) ? json.allowlist : [],
        admins: Array.isArray(json?.admins) ? json.admins : [],
      };

      return betaCfgRef.current;
    }

    async function enforceBetaGate(userEmail) {
      const cfg = await loadBetaConfig();
      if (!alive) return false;

      // If beta is closed => only allow allowlist/admin
      if (!cfg.betaOpen) {
        const ok = isAllowedEmailFromLists(userEmail, cfg.allowlist, cfg.admins);

        // Fallback to client env (in case API route isn't reachable for some reason)
        const fallbackOk = isAllowedEmail(userEmail);

        if (!ok && !fallbackOk) {
          await kickToBetaClosed("Beta access is closed for this email.");
          return false;
        }
      }

      return true;
    }

    async function boot() {
      try {
        setGateError("");

        // Prime config early (prevents stale NEXT_PUBLIC issues)
        await loadBetaConfig();

        // 1) Quick check
        const { data } = await sb.auth.getSession();
        if (!alive) return;

        if (data?.session) {
          const session = data.session;
          const userEmail = session.user?.email || "";
          setEmail(userEmail);

          const ok = await enforceBetaGate(userEmail);
          if (!ok) return;

          setAuthReady(true);
          return;
        }

        // 2) Listen (OAuth callback may still be finalizing session storage)
        const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
          if (!alive) return;

          const userEmail = session?.user?.email || "";
          setEmail(userEmail);

          if (session) {
            const ok = await enforceBetaGate(userEmail);
            if (!ok) return;

            setAuthReady(true);
            return;
          }

          const next = pathname ? pathname : "/dashboard";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        });

        unsubscribeAuth = () => sub?.subscription?.unsubscribe?.();

        // 3) Re-check after a short delay; only then redirect if still no session
        setTimeout(async () => {
          try {
            if (!alive) return;

            const { data: again } = await sb.auth.getSession();
            if (again?.session) {
              const session = again.session;
              const userEmail = session.user?.email || "";
              setEmail(userEmail);

              const ok = await enforceBetaGate(userEmail);
              if (!ok) return;

              setAuthReady(true);
              return;
            }

            const next = pathname ? pathname : "/dashboard";
            router.replace(`/login?next=${encodeURIComponent(next)}`);
          } catch (e) {
            const next = pathname ? pathname : "/dashboard";
            router.replace(`/login?next=${encodeURIComponent(next)}`);
          }
        }, 400);
      } catch (e) {
        setGateError("Something went wrong while preparing your session.");
      }
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

  const filteredNav = nav.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase()));

  function pageLabelFromPath(p) {
    if (!p) return "Dashboard";
    if (p === "/dashboard") return "Overview";
    if (p.startsWith("/dashboard/contacts")) return "Contacts";
    if (p.startsWith("/dashboard/deals")) return "Deals";
    if (p.startsWith("/dashboard/notes")) return "Notes";
    if (p.startsWith("/dashboard/tasks")) return "Tasks";
    if (p.startsWith("/dashboard/calendar")) return "Calendar";
    if (p.startsWith("/dashboard/settings")) return "Settings";
    if (p.startsWith("/dashboard/admin")) return "Admin";
    return "Dashboard";
  }

  const breadcrumb = pageLabelFromPath(pathname);

  // ✅ Only block UI until auth is confirmed (NO subscription gate here)
  if (!authReady) {
    return (
      <div style={styles.gate}>
        <div style={styles.gateCard}>
          <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: -0.2 }}>Loading…</div>

          {gateError ? (
            <>
              <div style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>{gateError}</div>
              <button onClick={() => window.location.reload()} style={styles.gateBtn} type="button">
                Refresh
              </button>
            </>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.7, fontWeight: 800, fontSize: 13 }}>
              Signing you in and preparing your workspace.
            </div>
          )}
        </div>
      </div>
    );
  }

  function Sidebar({ mode }) {
    const isDrawer = mode === "drawer";
    const showSearch = !collapsed || isDrawer;

    return (
      <aside
        style={{
          ...styles.sidebar,
          ...(isDrawer
            ? styles.drawer
            : {
                width: collapsed ? 84 : 272,
                transition: "width 180ms ease",
                position: "sticky",
                top: 0,
                height: "100vh",
              }),
        }}
      >
        <div style={styles.brand}>
          <div style={styles.logo} aria-hidden="true">
            V
          </div>

          {!collapsed || isDrawer ? (
            <div style={{ minWidth: 0 }}>
              <div style={styles.brandName}>Vexta</div>
              <div style={styles.brandSub}>CRM Dashboard</div>
            </div>
          ) : null}

          {isDrawer ? (
            <button onClick={() => setMobileOpen(false)} style={styles.drawerClose} title="Close" type="button">
              ✕
            </button>
          ) : (
            <button
              onClick={() => setCollapsed((v) => !v)}
              style={styles.collapseBtn}
              title={collapsed ? "Expand" : "Collapse"}
              type="button"
            >
              {collapsed ? "»" : "«"}
            </button>
          )}
        </div>

        {showSearch ? (
          <div style={styles.searchWrap}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isDrawer ? "Search pages…" : collapsed ? "Search…" : "Search pages…"}
              style={styles.search}
            />
          </div>
        ) : null}

        <nav style={styles.nav}>
          {(q.trim() ? filteredNav : nav).map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                  justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
                }}
                title={collapsed && !isDrawer ? item.label : undefined}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={styles.navDot} aria-hidden="true" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {collapsed && !isDrawer ? item.label : item.label}
                  </span>
                </span>

                {!collapsed || isDrawer ? <span style={styles.navArrow}>›</span> : null}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userBlock}>
            <div style={styles.userDot} />
            {!collapsed || isDrawer ? (
              <div style={{ minWidth: 0 }}>
                <div style={styles.userLabel}>Signed in</div>
                <div style={styles.userEmail} title={email}>
                  {email || "Loading..."}
                </div>
              </div>
            ) : null}
          </div>

          {!collapsed || isDrawer ? (
            <div style={styles.sideHint}>Tip: Open a contact → manage everything from one place.</div>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <div style={styles.shell}>
      <div style={styles.bg} aria-hidden="true" />

      {/* Desktop sidebar */}
      {!isMobile ? <Sidebar mode="desktop" /> : null}

      {/* Mobile drawer */}
      {isMobile ? (
        <>
          <div
            style={{
              ...styles.overlay,
              opacity: mobileOpen ? 1 : 0,
              pointerEvents: mobileOpen ? "auto" : "none",
            }}
            onClick={() => setMobileOpen(false)}
          />

          <div
            style={{
              ...styles.drawerWrap,
              transform: mobileOpen ? "translateX(0)" : "translateX(-110%)",
            }}
            role="dialog"
            aria-modal="true"
          >
            <Sidebar mode="drawer" />
          </div>
        </>
      ) : null}

      <div style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ ...styles.mobileMenuBtn, display: isMobile ? "inline-flex" : "none" }}
              title="Menu"
              type="button"
            >
              ☰
            </button>

            <div style={styles.breadcrumb}>
              <span style={{ opacity: 0.68 }}>Dashboard</span>
              <span style={{ opacity: 0.28, margin: "0 8px" }}>›</span>
              <span style={{ fontWeight: 950 }}>{breadcrumb}</span>
            </div>
          </div>

          <div style={styles.topbarRight}>
            <Link href="/dashboard/settings" style={styles.topBtn}>
              Settings
            </Link>
            <button onClick={logout} style={{ ...styles.topBtn, ...styles.topBtnDanger }} type="button">
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
    background: "#070707",
    color: "white",
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    position: "relative",
  },

  // Subtle background polish
  bg: {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    background:
      "radial-gradient(900px circle at 14% 10%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(900px circle at 85% 28%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(to bottom, #070707, #050505)",
  },

  // Gate screen
  gate: {
    minHeight: "100vh",
    background: "#070707",
    color: "white",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  gateCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
    padding: 18,
    textAlign: "center",
  },
  gateBtn: {
    marginTop: 14,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },

  // Sidebar
  sidebar: {
    borderRight: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(16,16,16,0.72)",
    backdropFilter: "blur(10px)",
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
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    position: "relative",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    flexShrink: 0,
    letterSpacing: -0.4,
  },
  brandName: { fontWeight: 950, fontSize: 16, lineHeight: 1.1, letterSpacing: -0.2 },
  brandSub: { fontSize: 12, opacity: 0.72, marginTop: 2 },

  collapseBtn: {
    marginLeft: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    padding: "6px 10px",
  },

  drawerClose: {
    marginLeft: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    padding: "6px 10px",
  },

  searchWrap: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: 10,
  },
  search: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    fontWeight: 800,
    fontSize: 13,
  },

  nav: { display: "grid", gap: 8, marginTop: 2 },
  navItem: {
    padding: "10px 12px",
    borderRadius: 14,
    textDecoration: "none",
    color: "white",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    fontWeight: 900,
    opacity: 0.92,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    transition: "transform 0.05s ease, background 0.15s ease, border 0.15s ease",
  },
  navItemActive: {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    opacity: 1,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.35)",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  navArrow: {
    opacity: 0.5,
    fontWeight: 950,
  },

  sidebarBottom: { marginTop: "auto", display: "grid", gap: 10 },
  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
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
    maxWidth: 180,
  },
  sideHint: {
    fontSize: 12,
    opacity: 0.65,
    lineHeight: 1.4,
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  },

  // Main area
  main: { display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: {
    height: 64,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    background: "rgba(10,10,10,0.72)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  topbarLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  breadcrumb: {
    fontWeight: 900,
    opacity: 0.95,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    letterSpacing: -0.2,
  },
  topbarRight: { display: "flex", gap: 10, alignItems: "center" },

  topBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
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

  content: { padding: 18, minWidth: 0 },
  container: { maxWidth: 1120, margin: "0 auto", width: "100%" },

  // Mobile
  mobileMenuBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: 1,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.60)",
    zIndex: 80,
    transition: "opacity 160ms ease",
  },

  drawerWrap: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    zIndex: 90,
    transition: "transform 180ms ease",
  },

  drawer: {
    width: "100%",
    height: "100%",
  },
};
