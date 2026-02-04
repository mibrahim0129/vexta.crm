// app/components/Footer.js
import Link from "next/link";

export default function Footer({ variant = "light" }) {
  const isDark = variant === "dark";

  const styles = {
    wrap: {
      marginTop: 28,
      paddingTop: 16,
      borderTop: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.10)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      opacity: isDark ? 0.9 : 0.85,
      color: isDark ? "white" : "#111",
    },
    left: {
      fontWeight: 850,
      fontSize: 12,
    },
    links: {
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      alignItems: "center",
    },
    link: {
      fontSize: 12,
      fontWeight: 850,
      textDecoration: "none",
      color: isDark ? "rgba(255,255,255,0.88)" : "#111",
      opacity: 0.9,
    },
  };

  const links = [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/refunds", label: "Refunds" },
    { href: "/contact", label: "Contact" },
    { href: "/about", label: "About" },
  ];

  return (
    <footer style={styles.wrap}>
      <div style={styles.left}>© {new Date().getFullYear()} Vexta</div>

      <div style={styles.links}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={styles.link}>
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
// app/components/Footer.js
import Link from "next/link";

export default function Footer({ variant = "light" }) {
  const isDark = variant === "dark";

  const links = [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/refunds", label: "Refunds" },
    { href: "/contact", label: "Contact" },
    { href: "/about", label: "About" },
  ];

  return (
    <footer className={`footer ${isDark ? "dark" : "light"}`}>
      <div className="inner">
        <div className="left">© {new Date().getFullYear()} Vexta</div>

        <nav className="links" aria-label="Footer links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="link">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <style jsx>{`
        .footer {
          margin-top: 28px;
          padding-top: 16px;
        }

        .inner {
          border-top: 1px solid rgba(0, 0, 0, 0.10);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 14px;
          opacity: 0.92;
          color: #111;
        }

        .left {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: -0.2px;
        }

        .links {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: center;
        }

        .link {
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          color: #111;
          opacity: 0.86;
          transition: opacity 0.15s ease, transform 0.05s ease;
        }
        .link:hover {
          opacity: 1;
        }
        .link:active {
          transform: translateY(1px);
        }

        /* Dark variant (matches your landing/pricing/login/signup) */
        .dark .inner {
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.85);
        }
        .dark .link {
          color: rgba(255, 255, 255, 0.78);
        }
        .dark .link:hover {
          color: #fff;
          opacity: 1;
        }
      `}</style>
    </footer>
  );
}
