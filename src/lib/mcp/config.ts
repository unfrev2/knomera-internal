/**
 * MCP configuration — hostnames come from env, never hard-coded in domain tools.
 */

export const MCP_SCOPE = "mcp";
export const MCP_PROTOCOL_VERSION = "2025-11-25";

export function getAppBaseUrl(): string {
  const fromEnv = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Local / unset: callers should prefer request-derived origin when available.
  return "http://localhost:3000";
}

export function getWorkspaceSlug(): string {
  return process.env.WORKSPACE_SLUG?.trim() || "knomera";
}

export function getMcpResourceUrl(baseUrl = getAppBaseUrl()): string {
  return `${baseUrl}/mcp`;
}

export function getOauthIssuer(baseUrl = getAppBaseUrl()): string {
  return process.env.MCP_OAUTH_ISSUER?.trim().replace(/\/$/, "") || baseUrl;
}

export function getMcpOauthSigningSecret(): string {
  const secret = process.env.MCP_OAUTH_SIGNING_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "MCP_OAUTH_SIGNING_SECRET must be set to a strong value (16+ chars).",
    );
  }
  return secret;
}

export function getMcpConnectorSecret(): string {
  const secret = process.env.MCP_CONNECTOR_SECRET?.trim();
  if (!secret || secret.length < 8) {
    throw new Error(
      "MCP_CONNECTOR_SECRET must be set to authorize MCP clients.",
    );
  }
  return secret;
}

export function isMcpAuthConfigured(): boolean {
  try {
    getMcpOauthSigningSecret();
    getMcpConnectorSecret();
    return true;
  } catch {
    return false;
  }
}
