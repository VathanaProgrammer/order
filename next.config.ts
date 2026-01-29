import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // CRITICAL: Disable RSC prefetch for Safari
  experimental: {
    staleTimes: {
      dynamic: 0,  // Immediate revalidation for dynamic content
      static: 0,   // No caching for static
    },
    // Disable features that Safari might handle poorly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Optional: Add cache headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Vary',
            // Simplify Vary header - remove RSC prefetch headers
            value: 'Accept-Encoding, User-Agent',
          },
        ],
      },
    ];
  },
  
  images: {
    domains: ["127.0.0.1", "localhost", "syspro.asia", "order.sobenterprise.biz", "barista.sobkh.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.shutterstock.com",
      },
      {
        protocol: "https",
        hostname: "e7.pngegg.com",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "syspro.asia",
      },
      {
        protocol: "https",
        hostname: "order.sobenterprise.biz",
      },
      {
        protocol: "https",
        hostname: "barista.sobkh.com",
      },
    ],
  },
};

export default nextConfig;