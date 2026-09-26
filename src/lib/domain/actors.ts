/**
 * System and founder attribution identities.
 * `ai` is not a login account — only an authorship/attribution marker.
 */

export const AI_ACTOR_ID = "ai" as const;

export type SystemActorId = typeof AI_ACTOR_ID;

/** Founders who can authenticate. */
export const LOGIN_USER_IDS = ["jon", "ahmed"] as const;

export function isLoginCapableUserId(id: string): id is "jon" | "ahmed" {
  return id === "jon" || id === "ahmed";
}

export function isAiActor(id: string | null | undefined): boolean {
  return id === AI_ACTOR_ID;
}
