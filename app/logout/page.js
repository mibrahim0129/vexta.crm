"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch (e) {}
      router.replace("/login");
    }
    run();
  }, [router]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>Logging out…</h2>
      <p style={{ opacity: 0.7 }}>Sending you back to login.</p>
    </div>
  );
}
