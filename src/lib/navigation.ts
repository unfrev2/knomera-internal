import { isRedirectError } from "next/dist/client/components/redirect-error";

/** Re-throw Next.js redirect/navigation signals so try/catch around server actions works. */
export function rethrowNavigation(error: unknown): void {
  if (isRedirectError(error)) throw error;
}
