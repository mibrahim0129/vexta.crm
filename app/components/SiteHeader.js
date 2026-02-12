"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`navLink ${active ? "navLinkActive" : ""}`}
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="wrap siteHeaderInner">
        <Link href="/" className="brand">
          <span className="brandMark">V</span>
          <span className="brandName">Vexta</span>
        </Link>

        <nav className="nav">
          <NavLink href="/about">About</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
        </nav>

        <div className="headerRight">
          <Link className="btnGhost" href="/login">
            Log in
          </Link>
          <Link className="btnPrimary" href="/signup">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
