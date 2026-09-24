import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AppUserId, SessionUser } from "@/lib/types";
import { APP_USERS } from "@/lib/labels";

export const SESSION_COOKIE = "knomera_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a strong value (16+ chars).");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: AppUserId): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function readSessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub as AppUserId | undefined;
    if (!userId || !(userId in APP_USERS)) return null;
    return APP_USERS[userId];
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export function sessionCookieOptions(token: string) {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
