import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
