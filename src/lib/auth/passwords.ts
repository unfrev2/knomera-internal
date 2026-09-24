import bcrypt from "bcryptjs";
import type { AppUserId } from "@/lib/types";
import { APP_USERS } from "@/lib/labels";

/**
 * Password hashes may be stored as:
 * 1. base64(bcrypt) — preferred; avoids Next.js/$ dotenv expansion bugs
 * 2. raw bcrypt ($2…)
 * 3. bcrypt with \$ escapes for older .env.local files
 */
export function normalizePasswordHash(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim().replace(/^["']|["']$/g, "");

  if (trimmed.startsWith("$2")) {
    return trimmed;
  }

  if (trimmed.includes("\\$")) {
    const unescaped = trimmed.replace(/\\\$/g, "$");
    if (unescaped.startsWith("$2")) return unescaped;
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.startsWith("$2")) return decoded;
  } catch {
    // ignore
  }

  return undefined;
}

function hashForUser(userId: AppUserId): string | undefined {
  if (userId === "jon") {
    return normalizePasswordHash(process.env.JON_PASSWORD_HASH);
  }
  if (userId === "ahmed") {
    return normalizePasswordHash(process.env.AHMED_PASSWORD_HASH);
  }
  return undefined;
}

export async function verifyUserPassword(
  userId: AppUserId,
  password: string,
): Promise<boolean> {
  if (!(userId in APP_USERS)) return false;
  const hash = hashForUser(userId);
  if (!hash || !hash.startsWith("$2")) return false;
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function encodePasswordHashForEnv(bcryptHash: string): string {
  return Buffer.from(bcryptHash, "utf8").toString("base64");
}
