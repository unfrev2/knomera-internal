import { createRegisteredClientId } from "@/lib/mcp/auth/tokens";
import { getAppBaseUrl, MCP_SCOPE } from "@/lib/mcp/config";

type RegisterBody = {
  redirect_uris?: string[];
  client_name?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
};

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const redirectUris = body.redirect_uris?.filter(Boolean) ?? [];
  if (redirectUris.length === 0) {
    return Response.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris is required.",
      },
      { status: 400 },
    );
  }

  const { clientId, clientSecret } = await createRegisteredClientId({
    redirectUris,
    clientName: body.client_name ?? null,
  });

  return Response.json(
    {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: redirectUris,
      grant_types: body.grant_types ?? ["authorization_code"],
      response_types: body.response_types ?? ["code"],
      token_endpoint_auth_method:
        body.token_endpoint_auth_method ?? "client_secret_post",
      client_name: body.client_name ?? "Knomera MCP Client",
      scope: body.scope ?? MCP_SCOPE,
      registration_client_uri: `${getAppBaseUrl()}/oauth/register`,
    },
    { status: 201 },
  );
}
