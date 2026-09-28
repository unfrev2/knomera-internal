import { hrefForLinkable, type LinkableObjectType } from "@/lib/domain/linkable";
import { getAppBaseUrl } from "@/lib/mcp/config";

/** Absolute user-openable URL for a Knomera record. */
export function absoluteRecordUrl(
  type: LinkableObjectType,
  id: string,
  baseUrl = getAppBaseUrl(),
): string {
  return `${baseUrl}${hrefForLinkable(type, id)}`;
}

export function absoluteAppPath(
  path: string,
  baseUrl = getAppBaseUrl(),
): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalised}`;
}
