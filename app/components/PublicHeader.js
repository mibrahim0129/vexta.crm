// app/components/PublicHeader.js
import Link from "next/link";

export default function PublicHeader({
  variant = "dark", // "dark" | "light"
  active = "", // "pricing" | "about" | "contact" | ""
  right = "auth", // "auth" | "login" | "signup" | "none"
}) {
  const isDark = variant === "dark";

  const styles = {
    header: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
      background: isDark ? "rgba(7,7,7,0.75)" : "rgba(255,255,255,0.80)",
      backdropFilter: "blur(12px)",
    },
    wrap: {
      width: "100%",
      maxWidth: 1120,
      margin: "0 auto",
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    brand: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      textDecoration: "none",
      color: isDark ? "#fff" : "#0a0a0a",
    },
    logoMark: {
      width: 36,
      height: 36,
      borderRadius: 12,
      border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.10)",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      backgroundImage: 'url("/VLT.png")',
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "contain",
      boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.40)" : "0 10px 30px rgba(0,0,0,0.08)",
      flex: "0 0 auto",
    },
    brandName: {
      fontSize: 18,
      fontWeight: 950,
      letterSpacing: "-0.4px",
    },
    nav: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    },
    navLink: (isActive) => ({
      textDecoration: "none",
      fontSize: 13,
      fontWeight: 900,
      color: isDark ? "rgba(255,255,255,0.75)" : "rgba(10,10,10,0.70)",
      borderBottom: isActive
        ? isDark
          ? "2px solid rgba(255,255,255,0.75)"
          : "2px solid rgba(0,0,0,0.45)"
        : "2px solid transparent",
      paddingBottom: 2,
      opacity: isActive ? 1 : 0.9,
    }),
    actions: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    btn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 12px",
      borderRadius: 14,
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.10)",
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      color: isDark ? "#fff" : "#0a0a0a",
      userSelect: "none",
    },
    btnPrimary: {
      background: isDark ? "#fff" : "#0a0a0a",
      color: isDark ? "#0a0a0a" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.20)",
    },
  };

  return (
    <header style={styles.header}>
      <div style={styles.wrap}>
        <Link href="/" style={styles.brand} aria-label="Vexta home">
          <span style={styles.logoMark} aria-hidden="true" />
          <span style={styles.brandName}>Vexta</span>
        </Link>

        <nav style={styles.nav} aria-label="Public navigation">
          <Link href="/pricing" style={styles.navLink(active === "pricing")}>
            Pricing
          </Link>
          <Link href="/about" style={styles.navLink(active === "about")}>
            About
          </Link>
          <Link href="/contact" style={styles.navLink(active === "contact")}>
            Contact
          </Link>
        </nav>

        <div style={styles.actions}>
          {right === "auth" ? (
            <>
              <Link href="/login" style={styles.btn}>
                Log in
              </Link>
              <Link href="/signup" style={styles.btnPrimary}>
                Sign up
              </Link>
            </>
          ) : right === "login" ? (
            <Link href="/login" style={styles.btn}>
              Log in
            </Link>
          ) : right === "signup" ? (
            <Link href="/signup" style={styles.btnPrimary}>
              Sign up
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}