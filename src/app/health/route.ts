import { NextResponse } from "next/server";

/** Minimal service health — no infrastructure details or secrets. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
