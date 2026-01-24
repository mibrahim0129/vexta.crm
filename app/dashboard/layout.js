"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // Global search
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [contactResults, setContactResults] = useState([]);
  const [dealResults, setDealResults] = useState([]);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    // restore sidebar state
    try {
      const v = localStorage.getItem("vexta_sidebar_collapsed");
      setCollapsed(v === "1");
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        const e = data?.session?.user?.email || "";
        if (!cancelled) setEmail(e);
      } catch {
        if (!cancelled) setEmail("");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  function toggleSidebar() {
    setCollapsed((p) => {
      const next = !p;
      try {
        localStorage.setItem("vexta_sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function isActive(href) {
    if (!pathname) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQ("");
    setContactResults([]);
    setDealResults([]);
    setSearchLoading(false);
  }

  // keyboard shortcuts: Ctrl/Cmd+K to open, Esc to close
  useEffect(() => {
    function onKeyDown(e) {
      const key = String(e.key || "").toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      if (meta && key === "k") {
        e.preventDefault();
        if (!searchOpen) openSearch();
        else closeSearch();
      }

      if (key === "escape" && searchOpen) {
        e.preventDefault();
        closeSearch();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  async function runSearch(term) {
    const t = term.trim();
    if (t.length < 2) {
      setContactResults([]);
      setDealResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      // contacts
      const contactsQ = sb
        .from("contacts")
        .select("id, first_name, last_name, email, phone")
        .or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`)
        .limit(6);

      // deals
      const dealsQ = sb
        .from("deals")
        .select("id, title, status, contact_id")
        .ilike("title", `%${t}%`)
        .limit(6);

      const [cRes, dRes] = await Promise.all([contactsQ, dealsQ]);

      if (cRes.error) throw cRes.error;
      if (dRes.error) throw dRes.error;

      setContactResults(Array.isArray(cRes.data) ? cRes.data : []);
      setDealResults(Array.isArray(dRes.data) ? dRes.data : []);
    } catch (e) {
      console.error(e);
      setContactResults([]);
      setDealResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function onSearchChange(v) {
    setQ(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(v), 200);
  }

  const nav = [
    { href: "/dashboard", label: "Overview", icon: "🏠" },
    { href: "/dashboard/contacts", label: "Contacts", icon: "👤" },
    { href: "/dashboard/deals", label: "Deals", icon: "💼" },
    { href: "/dashboard/notes", label: "Notes", icon: "📝" },
    { href: "/dashboard/tasks", label: "Tasks", icon: "✅" },
    { href: "/dashboard/calendar", label: "Calendar", icon: "📅" },
  ];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div style={{ ...styles.shell, gridTemplateColumns: collapsed ? "80px 1fr" : "260px 1fr" }}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logo}>V</div>
          {!collapsed ? (
            <div>
              <div style={styles.brandName}>Vexta</div>
              <div style={styles.brandSub}>CRM Dashboard</div>
            </div>
          ) : null}
        </div>

        <nav style={styles.nav}>
          {nav.map((item) => {
            const active = isActive(item.href);
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
                <span style={{ width: 22, display: "inline-grid", placeItems: "center" }}>{item.icon}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarBottom}>
          {!collapsed ? (
            <>
              <div style={styles.userBlock}>
                <div style={styles.userDot} />
                <div style={{ minWidth: 0 }}>
                  <div style={styles.userLabel}>Signed in</div>
                  <div style={styles.userEmail} title={email}>
                    {email || "Loading..."}
                  </div>
                </div>
              </div>

              <div style={styles.sideHint}>Tip: Ctrl + K opens global search.</div>
            </>
          ) : (
            <div style={{ opacity: 0.7, fontSize: 12, textAlign: "center" }}>Ctrl+K</div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div style={styles.main}>
        {/* TOP BAR */}
        <div style={styles.topbar}>
          <div style={styles.topLeft}>
            <button onClick={toggleSidebar} style={styles.iconBtn} title="Toggle sidebar">
              {collapsed ? "➡️" : "⬅️"}
            </button>

            <button onClick={openSearch} style={styles.searchBtn} title="Search (Ctrl+K)">
              <span style={{ opacity: 0.8 }}>Search contacts & deals…</span>
              <span style={styles.kbd}>Ctrl K</span>
            </button>
          </div>

          <div style={styles.topbarRight}>
            <div style={styles.datePill} title={today}>
              {today}
            </div>

            <Link href="/dashboard/settings" style={styles.topBtn}>
              Settings
            </Link>
            <button onClick={logout} style={{ ...styles.topBtn, ...styles.topBtnDanger }}>
              Logout
            </button>
          </div>
        </div>

        {/* SEARCH MODAL */}
        {searchOpen ? (
          <div style={styles.modalOverlay} onMouseDown={closeSearch}>
            <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
              <div style={styles.modalTop}>
                <div style={{ fontWeight: 950 }}>Search</div>
                <button onClick={closeSearch} style={styles.iconBtn} title="Close">
                  ✕
                </button>
              </div>

              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Type at least 2 letters…"
                style={styles.modalInput}
              />

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={styles.sectionTitle}>
                  Contacts {searchLoading ? <span style={{ opacity: 0.7 }}>(loading…)</span> : null}
                </div>

                {contactResults.length === 0 ? (
                  <div style={styles.empty}>No contact matches.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {contactResults.map((c) => {
                      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed";
                      return (
                        <Link
                          key={c.id}
                          href={`/dashboard/contacts/${c.id}`}
                          onClick={closeSearch}
                          style={styles.resultRow}
                        >
                          <div style={{ fontWeight: 950 }}>{name}</div>
                          <div style={styles.resultSub}>
                            {c.email ? c.email : ""}
                            {c.phone ? (c.email ? ` • ${c.phone}` : c.phone) : ""}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <div style={styles.sectionTitle}>Deals</div>

                {dealResults.length === 0 ? (
                  <div style={styles.empty}>No deal matches.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {dealResults.map((d) => (
                      <Link
                        key={d.id}
                        href={`/dashboard/deals`}
                        onClick={closeSearch}
                        style={styles.resultRow}
                        title="Opens Deals page"
                      >
                        <div style={{ fontWeight: 950 }}>{d.title}</div>
                        <div style={styles.resultSub}>{d.status ? `Status: ${d.status}` : "Deal"}</div>
                      </Link>
                    ))}
                  </div>
                )}

                <div style={styles.modalHint}>Tip: Press Esc to close.</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* PAGE CONTENT */}
        <div style={styles.content}>
          <div style={styles.pageCard}>{children}</div>
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
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "white",
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
    fontWeight: 850,
    opacity: 0.92,
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
    gap: 12,
  },

  topLeft: { display: "flex", gap: 10, alignItems: "center" },
  topbarRight: { display: "flex", gap: 10, alignItems: "center" },

  iconBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  },

  searchBtn: {
    minWidth: 320,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 850,
  },
  kbd: {
    fontSize: 12,
    opacity: 0.8,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    padding: "3px 8px",
    borderRadius: 999,
    fontWeight: 950,
  },

  datePill: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 13,
    opacity: 0.95,
  },

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
  pageCard: {
    border: "1px solid #1f1f1f",
    background: "#0f0f0f",
    borderRadius: 18,
    padding: 18,
    minHeight: "calc(100vh - 96px)",
  },

  // modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#0b0b0b",
    boxShadow: "0 18px 80px rgba(0,0,0,0.65)",
    padding: 14,
  },
  modalTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  modalInput: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    fontWeight: 850,
  },
  sectionTitle: { fontSize: 12, opacity: 0.7, fontWeight: 950, marginTop: 2 },
  empty: { fontSize: 13, opacity: 0.75, padding: 10, borderRadius: 12, border: "1px solid #1f1f1f" },
  resultRow: {
    display: "grid",
    gap: 4,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #1f1f1f",
    background: "#111",
    textDecoration: "none",
    color: "white",
  },
  resultSub: { fontSize: 12, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  modalHint: { marginTop: 6, fontSize: 12, opacity: 0.65 },
};
