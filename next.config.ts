import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable image optimization for Electron (no server-side optimization needed)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
