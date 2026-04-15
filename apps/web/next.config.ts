import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eth-staking/domain", "@eth-staking/ui"]
};

export default nextConfig;
