import type { NextConfig } from "next";

const FRAME_ANCESTORS = [
  "'self'",
  "https://cruzrojacdmx-edomex.org",
  "https://*.cruzrojacdmx-edomex.org",
].join(" ");

const nextConfig: NextConfig = {
  // pdfjs-dist (pulled in by PDFLoader) resolves its worker file relative to
  // its own location on disk. Bundling it into .next breaks that lookup with
  // "Setting up fake worker failed", so keep these in node_modules at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],

  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${FRAME_ANCESTORS}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
