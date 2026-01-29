// app/billing/success/page.js
import { Suspense } from "react";
import SuccessClient from "./success-client";

export const dynamic = "force-dynamic"; // don’t prerender at build time

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#0b0b0b",
            color: "white",
          }}
        >
          <div style={{ fontWeight: 950, opacity: 0.9 }}>Finalizing…</div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
