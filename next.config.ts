import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.env.VERCEL ? undefined : "/home/user/zaikokanri",
  },
};

export default nextConfig;
