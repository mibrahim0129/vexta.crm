export default function BetaClosedPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#070707", color: "white" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.05)",
          boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 20, letterSpacing: -0.2 }}>Vexta Beta</div>
        <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800 }}>Beta access is currently closed.</div>
        <div style={{ marginTop: 8, opacity: 0.65, fontWeight: 700, fontSize: 13 }}>
          If you believe you should have access, contact the Vexta team.
        </div>
      </div>
    </div>
  );
}
