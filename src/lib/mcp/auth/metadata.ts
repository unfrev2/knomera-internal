import {
  getAppBaseUrl,
  getMcpResourceUrl,
  getOauthIssuer,
  MCP_SCOPE,
} from "@/lib/mcp/config";

export function authorizationServerMetadata(baseUrl = getAppBaseUrl()) {
  const issuer = getOauthIssuer(baseUrl);
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
    scopes_supported: [MCP_SCOPE],
    resource_indicator_parameter_supported: true,
  };
}

export function protectedResourceMetadata(baseUrl = getAppBaseUrl()) {
  return {
    resource: getMcpResourceUrl(baseUrl),
    authorization_servers: [getOauthIssuer(baseUrl)],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Knomera",
  };
}
