// app/dashboard/ui/styles.js
export const ui = {
  // Page wrapper
  page: {
    padding: 40,
    maxWidth: 1100,
    margin: "0 auto",
  },

  // Header row (title + actions)
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  // Typography
  h1: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 1.05,
    color: "white",
  },
  h2: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
    color: "white",
  },
  subtext: {
    margin: "8px 0 0",
    opacity: 0.75,
    lineHeight: 1.45,
    color: "white",
  },

  // Layout grids
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    alignItems: "start",
  },

  // Card container
  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  // Badges / chips
  badge: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    opacity: 0.9,
    color: "white",
    background: "rgba(255,255,255,0.06)",
  },

  // Buttons
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "white",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },
  subtleBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.65)",
    background: "rgba(239,68,68,0.08)",
    color: "#ef4444",
    fontWeight: 900,
    cursor: "pointer",
  },

  // Link styled as a button
  linkBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  // Inputs / selects
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },

  // Field labels
  label: {
    display: "grid",
    gap: 6,
  },
  labelText: {
    fontSize: 12,
    opacity: 0.75,
    color: "white",
  },

  // Divider line
  divider: {
    height: 1,
    width: "100%",
    background: "rgba(255,255,255,0.12)",
    margin: "14px 0",
  },

  // Responsive helpers (optional usage)
  responsiveHint: {
    opacity: 0.7,
    fontSize: 12,
    color: "white",
  },
};
