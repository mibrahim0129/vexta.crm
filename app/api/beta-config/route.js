import { NextResponse } from "next/server";

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  const betaMode =
    process.env.NEXT_PUBLIC_BETA_MODE ?? process.env.BETA_MODE ?? "false";

  const allow =
    process.env.NEXT_PUBLIC_BETA_ALLOWLIST ?? process.env.BETA_ALLOWLIST ?? "";

  const admins =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "";

  return NextResponse.json({
    betaOpen: String(betaMode) === "true",
    allowlist: parseCsv(allow),
    admins: parseCsv(admins),
  });
}
