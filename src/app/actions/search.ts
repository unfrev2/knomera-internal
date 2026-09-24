"use server";

import { getRequestContext } from "@/lib/auth/context";
import { searchWorkspaceObjects } from "@/lib/db/search";
import type { LinkableObject } from "@/lib/domain/linkable";
import type { SearchableObjectType } from "@/lib/domain/linkable";

export async function searchLinkableObjectsAction(input: {
  query: string;
  types?: SearchableObjectType[];
  excludeIds?: string[];
  limit?: number;
}): Promise<LinkableObject[]> {
  const { workspace } = await getRequestContext();
  return searchWorkspaceObjects(workspace.id, {
    query: input.query ?? "",
    types: input.types,
    excludeIds: input.excludeIds,
    limit: input.limit,
  });
}
