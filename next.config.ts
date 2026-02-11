import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // FORCE unique build IDs for self-hosting
  generateBuildId: async () => {
    return `build-${new Date().getTime()}`;
  },

  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // 'must-revalidate' is key for Safari
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Vary',
            // Remove User-Agent to prevent "sticky" browser-specific caches
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },
  
  images: {
    // Note: 'domains' is deprecated in newer Next.js versions in favor of remotePatterns
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.shutterstock.com" },
      { protocol: "https", hostname: "e7.pngegg.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "syspro.asia" },
      { protocol: "https", hostname: "order.sobenterprise.biz" },
      { protocol: "https", hostname: "barista.sobkh.com" },
    ],
  },

  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
};

export default nextConfig;