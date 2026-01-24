export default function Button({ variant = "ghost", children, style, ...props }) {
  const base = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    fontWeight: 900,
    cursor: "pointer",
  };

  const variants = {
    ghost: { background: "transparent", color: "white" },
    primary: { background: "white", color: "black" },
    subtle: { background: "rgba(255,255,255,0.06)", color: "white" },
    danger: {
      background: "rgba(239,68,68,0.08)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.65)",
    },
  };

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}
