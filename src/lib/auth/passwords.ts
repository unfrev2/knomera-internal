import bcrypt from "bcryptjs";
import type { AppUserId } from "@/lib/types";
import { APP_USERS } from "@/lib/labels";

/**
 * Next.js expands $VAR in .env files, so bcrypt hashes must be stored with
 * each $ escaped as \$. Node's --env-file keeps those backslashes literally.
 * Normalize both forms to a real bcrypt hash.
 */
export function normalizePasswordHash(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\\$/g, "$");
}

function hashForUser(userId: AppUserId): string | undefined {
  if (userId === "jon") return normalizePasswordHash(process.env.JON_PASSWORD_HASH);
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
