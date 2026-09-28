import {
  consumeAuthorizationCode,
  createAccessToken,
} from "@/lib/mcp/auth/tokens";
import { MCP_SCOPE } from "@/lib/mcp/config";

function jsonError(error: string, status: number, description?: string) {
  return Response.json(
    {
      error,
      error_description: description ?? error,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function basicAuthClientId(request: Request): {
  clientId: string | null;
  clientSecret: string | null;
} {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return { clientId: null, clientSecret: null };
  }
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return { clientId: decoded, clientSecret: null };
    return {
      clientId: decoded.slice(0, idx),
      clientSecret: decoded.slice(idx + 1),
    };
  } catch {
    return { clientId: null, clientSecret: null };
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: URLSearchParams;
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, string>;
    body = new URLSearchParams(json);
  } else {
    body = new URLSearchParams(await request.text());
  }

  const grantType = body.get("grant_type");
  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", 400);
  }

  const basic = basicAuthClientId(request);
  const clientId = body.get("client_id") ?? basic.clientId;
  const redirectUri = body.get("redirect_uri");
  const code = body.get("code");
  const codeVerifier = body.get("code_verifier");

  if (!clientId || !redirectUri || !code || !codeVerifier) {
    return jsonError(
      "invalid_request",
      400,
      "client_id, redirect_uri, code, and code_verifier are required.",
    );
  }

  const consumed = await consumeAuthorizationCode(code, {
    clientId,
    redirectUri,
    codeVerifier,
  });
  if (!consumed) {
    return jsonError("invalid_grant", 400, "Invalid or expired authorization code.");
  }

  const token = await createAccessToken({
    clientId,
    mcpClient: consumed.mcpClient,
    resource: consumed.resource,
  });

  return Response.json(
    {
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: token.expiresIn,
      scope: MCP_SCOPE,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
