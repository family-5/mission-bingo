import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/mission-bingo",
  assetPrefix: "/mission-bingo/",
  images: { unoptimized: true },
};

export default nextConfig;
