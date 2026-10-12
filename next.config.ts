import type { NextConfig } from "next";
import { Configuration } from 'webpack';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.seuprodutonaweb.com.br",
      },
      {
        protocol: "https",
        hostname: "http2.mlstatic.com"
      }
    ],
  },
};

export default nextConfig;