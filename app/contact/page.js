"use client";

import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault(); // stop page refresh
    setSent(true);
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial", maxWidth: 700 }}>
      <h1>Contact</h1>

      {sent ? (
        <p style={{ marginTop: 20, fontWeight: "bold" }}>
          ✅ Thanks! Your message has been sent.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 12, marginTop: 20 }}
        >
          <label>
            Name
            <input
              type="text"
              required
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              required
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Message
            <textarea
              rows={5}
              required
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <button
            type="submit"
            style={{
              padding: 12,
              cursor: "pointer",
              fontWeight: "bold",
              border: "1px solid #000",
              background: "#fff",
            }}
          >
            Send Message
          </button>
        </form>
      )}
    </main>
  );
}
