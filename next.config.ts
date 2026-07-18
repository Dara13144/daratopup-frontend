import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from external domains used in the app
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'daratopup-backend-wapz.onrender.com',
      },
    ],
    unoptimized: true,
  },

  // Safety net: bake the production API URL in at build time even if env var is missing
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://daratopup-backend-wapz.onrender.com',
  },

  // Fix turbopack root warning — point to the frontend directory
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
