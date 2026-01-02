import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  images: {
    domains: ["127.0.0.1", "localhost", "syspro.asia", "order.sobenterprise.biz"], // Add syspro.asia here
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
        protocol: "https", // Add protocol
        hostname: "i.pinimg.com",
      },
      {
        protocol: "https", // Add protocol
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https", // Add protocol
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "syspro.asia", // Add this entry
      },
      {
        protocol: "https",
        hostname: "order.sobenterprise.biz", // Add this entry
      },
    ],
  },
};

export default nextConfig;