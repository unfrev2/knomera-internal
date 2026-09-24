import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Bindings for `next dev` only. Must not run during CI / `opennextjs-cloudflare build`,
// or Wrangler will demand a local Hyperdrive connection string.
// Avoid top-level await — Next loads this config via require().
if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}
