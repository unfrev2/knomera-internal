import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { protectedResourceMetadata } from "@/lib/mcp/auth/metadata";
import { getAppBaseUrl } from "@/lib/mcp/config";

export async function GET(request: Request) {
  const origin =
    process.env.APP_BASE_URL?.trim().replace(/\/$/, "") ||
    new URL(request.url).origin;
  return Response.json(protectedResourceMetadata(origin || getAppBaseUrl()), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
