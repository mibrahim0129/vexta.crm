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
