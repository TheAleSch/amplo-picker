import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Allow BuildHop previews without permitting arbitrary embedding.
            // Do not add X-Frame-Options: SAMEORIGIN; it conflicts with this.
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://buildhop.io https://*.buildhop.io;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      // Content negotiation: agents that send `Accept: text/markdown` get the
      // markdown reference at the same /docs URL. Browsers (text/html) fall
      // through to the React page.
      beforeFiles: [
        {
          source: "/docs",
          has: [
            {
              type: "header",
              key: "accept",
              value: "(.*)text/markdown(.*)",
            },
          ],
          destination: "/docs.md",
        },
      ],
    };
  },
};

export default nextConfig;
