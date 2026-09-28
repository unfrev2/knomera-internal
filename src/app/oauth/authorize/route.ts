import {
  createAuthorizationCode,
  inferMcpClientHint,
  readRegisteredClient,
  safeEqual,
} from "@/lib/mcp/auth/tokens";
import { getMcpConnectorSecret, getMcpResourceUrl } from "@/lib/mcp/config";

function htmlPage(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize Knomera MCP</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; color: #0f172a; }
    main { width: min(420px, 92vw); background: #fff; border: 1px solid #dbe2ea; border-radius: 12px; padding: 1.5rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { margin: 0 0 1rem; color: #475569; font-size: 0.95rem; line-height: 1.45; }
    label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    input[type=password] { width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.7rem 1rem; border: 0; border-radius: 8px; background: #0f2744; color: #fff; font-weight: 600; cursor: pointer; }
    .error { color: #b91c1c; margin-bottom: 1rem; font-size: 0.9rem; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function parseAuthorizeParams(url: URL) {
  return {
    clientId: url.searchParams.get("client_id") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? "",
    responseType: url.searchParams.get("response_type") ?? "",
    state: url.searchParams.get("state"),
    codeChallenge: url.searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: url.searchParams.get("code_challenge_method") ?? "",
    scope: url.searchParams.get("scope") ?? "mcp",
    resource: url.searchParams.get("resource"),
  };
}

async function validateAuthorizeParams(params: ReturnType<typeof parseAuthorizeParams>) {
  if (params.responseType !== "code") {
    return "Unsupported response_type (expected code).";
  }
  if (!params.clientId || !params.redirectUri) {
    return "Missing client_id or redirect_uri.";
  }
  if (!params.codeChallenge || params.codeChallengeMethod !== "S256") {
    return "PKCE S256 code_challenge is required.";
  }
  const client = await readRegisteredClient(params.clientId);
  if (!client) {
    return "Unknown client_id. Register via /oauth/register first.";
  }
  if (!client.redirectUris.includes(params.redirectUri)) {
    return "redirect_uri is not registered for this client.";
  }
  return null;
}

function renderForm(
  url: URL,
  error?: string,
): Response {
  const params = [...url.searchParams.entries()]
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}" />`,
    )
    .join("\n");
  return htmlPage(
    `<h1>Authorize Knomera MCP</h1>
     <p>Enter the MCP connector secret to allow this client to read Knomera knowledge and submit sourced research.</p>
     ${error ? `<p class="error">${error}</p>` : ""}
     <form method="post" action="/oauth/authorize">
       ${params}
       <label for="connector_secret">Connector secret</label>
       <input id="connector_secret" name="connector_secret" type="password" autocomplete="current-password" required />
       <button type="submit">Authorize</button>
     </form>`,
    error ? 400 : 200,
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseAuthorizeParams(url);
  const validationError = await validateAuthorizeParams(params);
  if (validationError) return renderForm(url, validationError);
  return renderForm(url);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const url = new URL(request.url);
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && key !== "connector_secret") {
      url.searchParams.set(key, value);
    }
  }
  const params = parseAuthorizeParams(url);
  const validationError = await validateAuthorizeParams(params);
  if (validationError) return renderForm(url, validationError);

  let connectorSecret: string;
  try {
    connectorSecret = getMcpConnectorSecret();
  } catch {
    return renderForm(url, "MCP connector secret is not configured on the server.");
  }

  const provided = String(form.get("connector_secret") ?? "");
  if (!safeEqual(provided, connectorSecret)) {
    return renderForm(url, "Invalid connector secret.");
  }

  const client = await readRegisteredClient(params.clientId);
  const mcpClient = inferMcpClientHint(params.clientId, client?.clientName);
  const code = await createAuthorizationCode({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: "S256",
    mcpClient,
    resource: params.resource ?? getMcpResourceUrl(),
  });

  const redirect = new URL(params.redirectUri);
  redirect.searchParams.set("code", code);
  if (params.state) redirect.searchParams.set("state", params.state);
  return Response.redirect(redirect.toString(), 302);
}
