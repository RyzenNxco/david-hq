import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self'; frame-ancestors 'self'; connect-src *;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
