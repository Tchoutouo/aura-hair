import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Article and review photos stored in Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
