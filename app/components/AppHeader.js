"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function AppNavLink({ href, children }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));

  return (
    <Link href={href} className={`appNavLink ${active ? "appNavLinkActive" : ""}`}>
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await sb.auth.getUser();
      if (!alive) return;
      setEmail(data?.user?.email || "");
    }

    load();
    return () => {
      alive = false;
    };
  }, [sb]);

  async function signOut() {
    await sb.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="appHeader">
      <div className="wrap appHeaderInner">
        <Link href="/dashboard" className="brand">
          <span className="brandMark">V</span>
          <span className="brandName">Vexta</span>
        </Link>

        <nav className="appNav">
          <AppNavLink href="/dashboard">Dashboard</AppNavLink>
          <AppNavLink href="/contacts">Contacts</AppNavLink>
          <AppNavLink href="/deals">Deals</AppNavLink>
          <AppNavLink href="/tasks">Tasks</AppNavLink>
          <AppNavLink href="/calendar">Calendar</AppNavLink>
        </nav>

        <div className="appHeaderRight">
          <div className="userPill" title={email || ""}>
            {email ? email : "Account"}
          </div>
          <button className="btnGhost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
