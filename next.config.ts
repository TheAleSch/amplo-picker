import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
