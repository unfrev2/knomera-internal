import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyUserPassword } from "@/lib/auth/passwords";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";

const loginSchema = z.object({
  userId: z.enum(["jon", "ahmed"]),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid user or password." },
      { status: 401 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid user or password." },
      { status: 401 },
    );
  }

  const { userId, password } = parsed.data;
  const valid = await verifyUserPassword(userId, password);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid user or password." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(userId);
  const jar = await cookies();
  const options = sessionCookieOptions(token);
  jar.set(options);

  return NextResponse.json({ ok: true });
}
