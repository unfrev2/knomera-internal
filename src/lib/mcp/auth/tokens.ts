import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { EXTERNAL_AI_ACTOR_ID } from "@/lib/domain/actors";
import {
  getAppBaseUrl,
  getMcpOauthSigningSecret,
  getMcpResourceUrl,
  MCP_SCOPE,
} from "@/lib/mcp/config";

export type McpClientHint = "claude" | "chatgpt" | "unknown";

export type McpAccessClaims = {
  sub: typeof EXTERNAL_AI_ACTOR_ID;
  client: McpClientHint;
  scope: string;
  client_id: string;
};

function signingKey() {
  return new TextEncoder().encode(getMcpOauthSigningSecret());
}

export function inferMcpClientHint(
  clientId: string | null | undefined,
  clientName?: string | null,
): McpClientHint {
  const hay = `${clientId ?? ""} ${clientName ?? ""}`.toLowerCase();
  if (hay.includes("claude") || hay.includes("anthropic")) return "claude";
  if (hay.includes("chatgpt") || hay.includes("openai")) return "chatgpt";
  return "unknown";
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/** Stateless DCR: client_id is a signed JWT embedding redirect_uris. */
export async function createRegisteredClientId(input: {
  redirectUris: string[];
  clientName?: string | null;
}): Promise<{ clientId: string; clientSecret: string }> {
  const clientId = await new SignJWT({
    typ: "mcp_oauth_client",
    redirect_uris: input.redirectUris,
    client_name: input.clientName ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(signingKey());

  const clientSecret = await new SignJWT({
    typ: "mcp_oauth_client_secret",
    client_id_hash: createHash("sha256").update(clientId).digest("hex"),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(signingKey());

  return { clientId, clientSecret };
}

export async function readRegisteredClient(clientId: string): Promise<{
  redirectUris: string[];
  clientName: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(clientId, signingKey());
    if (payload.typ !== "mcp_oauth_client") return null;
    const redirectUris = payload.redirect_uris;
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) return null;
    return {
      redirectUris: redirectUris.map(String),
      clientName:
        typeof payload.client_name === "string" ? payload.client_name : null,
    };
  } catch {
    return null;
  }
}

export async function createAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  mcpClient: McpClientHint;
  resource?: string | null;
}): Promise<string> {
  return new SignJWT({
    typ: "mcp_oauth_code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    mcp_client: input.mcpClient,
    resource: input.resource ?? getMcpResourceUrl(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(signingKey());
}

export async function consumeAuthorizationCode(
  code: string,
  input: {
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
  },
): Promise<{
  mcpClient: McpClientHint;
  resource: string;
} | null> {
  try {
    const { payload } = await jwtVerify(code, signingKey());
    if (payload.typ !== "mcp_oauth_code") return null;
    if (payload.client_id !== input.clientId) return null;
    if (payload.redirect_uri !== input.redirectUri) return null;
    if (payload.code_challenge_method !== "S256") return null;
    const challenge = String(payload.code_challenge ?? "");
    if (pkceChallengeS256(input.codeVerifier) !== challenge) return null;
    return {
      mcpClient: (payload.mcp_client as McpClientHint) ?? "unknown",
      resource: String(payload.resource ?? getMcpResourceUrl()),
    };
  } catch {
    return null;
  }
}

export async function createAccessToken(input: {
  clientId: string;
  mcpClient: McpClientHint;
  resource?: string;
  expiresInSeconds?: number;
}): Promise<{ accessToken: string; expiresIn: number; expiresAt: number }> {
  const expiresIn = input.expiresInSeconds ?? 60 * 60 * 8;
  const resource = input.resource ?? getMcpResourceUrl();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const accessToken = await new SignJWT({
    sub: EXTERNAL_AI_ACTOR_ID,
    client: input.mcpClient,
    scope: MCP_SCOPE,
    client_id: input.clientId,
  } satisfies McpAccessClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(resource)
    .setIssuer(getAppBaseUrl())
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(signingKey());

  return { accessToken, expiresIn, expiresAt };
}

export async function verifyMcpAccessToken(
  token: string,
): Promise<AuthInfo | undefined> {
  try {
    const resource = getMcpResourceUrl();
    const { payload } = await jwtVerify(token, signingKey(), {
      audience: resource,
    });
    if (payload.sub !== EXTERNAL_AI_ACTOR_ID) return undefined;
    const scope =
      typeof payload.scope === "string" ? payload.scope : MCP_SCOPE;
    if (!scope.split(/\s+/).includes(MCP_SCOPE)) return undefined;
    const clientId =
      typeof payload.client_id === "string" ? payload.client_id : "unknown";
    const mcpClient =
      (payload.client as McpClientHint | undefined) ??
      inferMcpClientHint(clientId);
    const expiresAt =
      typeof payload.exp === "number" ? payload.exp : undefined;
    if (expiresAt == null) return undefined;

    return {
      token,
      clientId,
      scopes: scope.split(/\s+/).filter(Boolean),
      expiresAt,
      resource: new URL(resource),
      extra: {
        actor: EXTERNAL_AI_ACTOR_ID,
        mcpClient,
      },
    };
  } catch {
    return undefined;
  }
}
