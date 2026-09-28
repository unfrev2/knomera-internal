import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import { verifyMcpAccessToken } from "@/lib/mcp/auth/tokens";
import { getAppBaseUrl, getMcpResourceUrl, MCP_SCOPE } from "@/lib/mcp/config";
import {
  MCP_INSTRUCTIONS,
  MCP_SERVER_INFO,
  registerKnomeraTools,
} from "@/lib/mcp/server";

const baseHandler = createMcpHandler(
  (server) => {
    registerKnomeraTools(server);
  },
  {
    serverInfo: MCP_SERVER_INFO,
    instructions: MCP_INSTRUCTIONS,
  },
);

const authHandler = withMcpAuth(
  baseHandler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined;
    return verifyMcpAccessToken(bearerToken);
  },
  {
    required: true,
    requiredScopes: [MCP_SCOPE],
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: getMcpResourceUrl(getAppBaseUrl()),
  },
);

async function handle(req: Request): Promise<Response> {
  // Local Inspector can send Origin; ensure CORS for browser clients.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      },
    });
  }

  const response = await authHandler(req);
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, WWW-Authenticate",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { handle as GET, handle as POST, handle as DELETE };
