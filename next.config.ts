import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone output for Vercel - Vercel handles this automatically
  // Vercel optimizes builds automatically
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
