"use client";

import Link from "next/link";

export default function UpgradeBanner({ title, body }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title || "Upgrade required"}</div>
          <div className="text-sm text-white/70">
            {body || "Your current plan doesn’t include this action. Upgrade to continue."}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
