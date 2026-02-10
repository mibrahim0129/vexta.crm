"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// ✅ Stripe subscription gating (single source of truth)
import { useSubscription } from "@/lib/subscription/useSubscription";

function pct(done, total) {
  if (!total) return 0;
  const p = Math.round((done / total) * 100);
  return Math.max(0, Math.min(100, p));
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

  // ✅ Subscription
  const { loading: subLoading, access, plan } = useSubscription();

  // ✅ Getting Started (dashboard only)
  const isOverview = pathname === "/dashboard";
  const [gsLoading, setGsLoading] = useState(false);
  const [gsErr, setGsErr] = useState("");
  const [gsCounts, setGsCounts] = useState({
    contacts: 0,
    deals: 0,
    notes: 0,
    tasks: 0,
    events: 0,
  });

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

  // ✅ Auth bootstrap (NO invite gating gate)
  useEffect(() => {
    let alive = true;
    let unsubscribeAuth = null;

    async function boot() {
      try {
        setGateError("");

        // 1) Quick session check
        const { data } = await sb.auth.getSession();
        if (!alive) return;

        if (data?.session) {
          const session = data.session;
          const userEmail = session.user?.email || "";
          setEmail(userEmail);
          setAuthReady(true);
          return;
        }

        // 2) Listen for auth changes (OAuth callback may still be finalizing)
        const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
          if (!alive) return;

          const userEmail = session?.user?.email || "";
          setEmail(userEmail);

          if (session) {
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

  // ✅ Subscription enforcement:
  // If authenticated but not subscribed -> force pricing (no free tier)
  useEffect(() => {
    if (!authReady) return;
    if (subLoading) return;

    // Allow pricing / billing / account routes without subscription
    const PUBLIC_OK = ["/pricing", "/billing", "/account", "/support"];
    const isPublicOk = PUBLIC_OK.some((p) => (pathname || "").startsWith(p));

    if (!access && !isPublicOk) {
      router.replace("/pricing?reason=subscribe");
    }
  }, [authReady, subLoading, access, pathname, router]);

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

  // ✅ Dashboard Getting Started counts (overview only)
  async function loadGettingStartedCounts() {
    setGsErr("");
    setGsLoading(true);

    try {
      const { data } = await sb.auth.getSession();
      if (!data?.session) {
        setGsLoading(false);
        return;
      }

      const [c1, c2, c3, c4, c5] = await Promise.all([
        sb.from("contacts").select("id", { count: "exact", head: true }),
        sb.from("deals").select("id", { count: "exact", head: true }),
        sb.from("notes").select("id", { count: "exact", head: true }),
        sb.from("tasks").select("id", { count: "exact", head: true }),
        sb.from("calendar_events").select("id", { count: "exact", head: true }),
      ]);

      const anyErr = c1.error || c2.error || c3.error || c4.error || c5.error;
      if (anyErr) throw anyErr;

      setGsCounts({
        contacts: c1.count || 0,
        deals: c2.count || 0,
        notes: c3.count || 0,
        tasks: c4.count || 0,
        events: c5.count || 0,
      });
    } catch (e) {
      console.error(e);
      setGsErr(e?.message || "Failed to load onboarding progress");
    } finally {
      setGsLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    if (!isOverview) return;

    loadGettingStartedCounts();

    const channel = sb.channel("gs-rt");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => loadGettingStartedCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => loadGettingStartedCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => loadGettingStartedCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadGettingStartedCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => loadGettingStartedCounts())
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isOverview]);

  const steps = [
    { key: "contacts", label: "Add your first contact", done: gsCounts.contacts > 0, href: "/dashboard/contacts" },
    { key: "deals", label: "Create a deal", done: gsCounts.deals > 0, href: "/dashboard/deals" },
    { key: "notes", label: "Log a note", done: gsCounts.notes > 0, href: "/dashboard/notes" },
    { key: "tasks", label: "Add a task", done: gsCounts.tasks > 0, href: "/dashboard/tasks" },
    { key: "events", label: "Add a calendar event", done: gsCounts.events > 0, href: "/dashboard/calendar" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progress = pct(doneCount, totalCount);
  const showGettingStarted = isOverview && doneCount < totalCount;

  // ✅ Gate screen while auth is unknown OR subscription status is loading (prevents UI flash)
  if (!authReady || subLoading) {
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
              Preparing your workspace.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ Hard paywall: if no access, redirect effect will fire; return null to avoid flash.
  const PUBLIC_OK = ["/pricing", "/billing", "/account", "/support"];
  const isPublicOk = PUBLIC_OK.some((p) => (pathname || "").startsWith(p));
  if (!access && !isPublicOk) return null;

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
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7, fontWeight: 850 }}>
                {access ? `Plan: ${plan || "Active"}` : "No subscription"}
              </div>
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
          <div style={styles.container}>
            {/* ✅ Getting Started (only on /dashboard) */}
            {showGettingStarted ? (
              <div style={styles.gsCard}>
                <div style={styles.gsTop}>
                  <div>
                    <div style={styles.gsTitle}>Getting Started</div>
                    <div style={styles.gsSub}>
                      {gsLoading ? "Checking your progress…" : `${doneCount}/${totalCount} completed • ${progress}%`}
                    </div>
                  </div>

                  <button onClick={loadGettingStartedCounts} style={styles.gsBtnGhost} type="button" disabled={gsLoading}>
                    {gsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>

                {gsErr ? <div style={styles.gsErr}>{gsErr}</div> : null}

                <div style={styles.gsBarTrack} aria-hidden="true">
                  <div style={{ ...styles.gsBarFill, width: `${progress}%` }} />
                </div>

                <div style={styles.gsGrid}>
                  {steps.map((s) => (
                    <div key={s.key} style={styles.gsStep}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ ...styles.gsCheck, ...(s.done ? styles.gsCheckOn : styles.gsCheckOff) }}>
                          {s.done ? "✓" : "•"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 950,
                              opacity: s.done ? 0.65 : 1,
                              textDecoration: s.done ? "line-through" : "none",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.label}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.65 }}>
                            {s.done ? "Done" : "Do this next — it unlocks the flow"}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={s.href}
                        style={{
                          ...styles.gsBtn,
                          ...(s.done ? styles.gsBtnDone : {}),
                        }}
                      >
                        {s.done ? "Open" : "Start"}
                      </Link>
                    </div>
                  ))}
                </div>

                <div style={styles.gsHint}>
                  Real talk: if someone can add a contact → deal → note in under 60 seconds, they’ll keep using the product.
                </div>
              </div>
            ) : null}

            {children}
          </div>
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

  // ✅ Getting Started styles
  gsCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  },
  gsTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  gsTitle: { fontWeight: 950, fontSize: 16, letterSpacing: -0.2 },
  gsSub: { marginTop: 4, fontSize: 12, opacity: 0.75, fontWeight: 850 },

  gsBtnGhost: {
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    textDecoration: "none",
  },

  gsErr: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.28)",
    background: "rgba(239,68,68,0.10)",
    color: "#fecaca",
    fontWeight: 850,
    fontSize: 13,
  },

  gsBarTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  gsBarFill: {
    height: "100%",
    borderRadius: 999,
    background: "rgba(255,255,255,0.55)",
    boxShadow: "0 0 0 4px rgba(255,255,255,0.08) inset",
    transition: "width 180ms ease",
  },

  gsGrid: {
    marginTop: 12,
    display: "grid",
    gap: 10,
  },

  gsStep: {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  gsCheck: {
    width: 26,
    height: 26,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    flexShrink: 0,
  },
  gsCheckOff: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.75)",
  },
  gsCheckOn: {
    border: "1px solid rgba(34,197,94,0.40)",
    background: "rgba(34,197,94,0.12)",
    color: "rgba(220,252,231,0.95)",
  },

  gsBtn: {
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
    fontSize: 13,
  },
  gsBtnDone: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    opacity: 0.85,
  },

  gsHint: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.7,
    fontWeight: 850,
    lineHeight: 1.45,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
};
