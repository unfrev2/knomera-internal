import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Bindings for `next dev` only. Must not run during CI / `opennextjs-cloudflare build`,
// or Wrangler will demand a local Hyperdrive connection string.
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import(
    "@opennextjs/cloudflare"
  );
  initOpenNextCloudflareForDev();
}
