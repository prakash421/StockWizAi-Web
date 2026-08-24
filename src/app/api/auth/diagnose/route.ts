import { NextResponse } from "next/server";
import { computeDiagnosis } from "@/lib/authDiagnose";

// Boolean-only report so we can diagnose "spinner forever" sign-in
// failures on Vercel without ever leaking secret values.
export const dynamic = "force-dynamic";

export async function GET() {
  const diag = computeDiagnosis();
  return NextResponse.json(diag, { status: diag.ok ? 200 : 503 });
}
