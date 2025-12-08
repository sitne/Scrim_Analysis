import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Explicitly set distDir to prevent nested directory structure during build
  distDir: '.next',
  // Disable image optimization for Electron (no server-side optimization needed)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
