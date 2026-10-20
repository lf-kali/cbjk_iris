import type { NextConfig } from "next";
import { siteConfig } from "./site.config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: siteConfig.images.remoteHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  allowedDevOrigins: [process.env.TAILNET_ADDRESS as string]
};

export default nextConfig;
