/**
 * System and founder attribution identities.
 * `ai` / `external_ai` are not login accounts — only authorship/attribution markers.
 */

export const AI_ACTOR_ID = "ai" as const;
/** MCP / external AI clients — never pretend to be a founder. */
export const EXTERNAL_AI_ACTOR_ID = "external_ai" as const;

export type SystemActorId = typeof AI_ACTOR_ID | typeof EXTERNAL_AI_ACTOR_ID;

/** Founders who can authenticate. */
export const LOGIN_USER_IDS = ["jon", "ahmed"] as const;

export function isLoginCapableUserId(id: string): id is "jon" | "ahmed" {
  return id === "jon" || id === "ahmed";
}

export function isAiActor(id: string | null | undefined): boolean {
  return id === AI_ACTOR_ID || id === EXTERNAL_AI_ACTOR_ID;
}
