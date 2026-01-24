export default function PageShell({ title, subtitle, right, children }) {
  return (
    <main style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>{title}</h1>
          {subtitle ? <p style={s.sub}>{subtitle}</p> : null}
        </div>
        {right ? <div style={s.right}>{right}</div> : null}
      </div>

      <div style={s.body}>{children}</div>
    </main>
  );
}

const s = {
  page: { maxWidth: 1100 },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  h1: { margin: 0, fontSize: 34, letterSpacing: -0.4 },
  sub: { margin: "8px 0 0", opacity: 0.7, lineHeight: 1.4 },
  right: { display: "flex", gap: 10, flexWrap: "wrap" },
  body: { display: "grid", gap: 12 },
};
