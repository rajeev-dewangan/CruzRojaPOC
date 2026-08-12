import type { NextConfig } from "next";

// A host that isn't listed here gets a blank iframe and a console-only error,
// so test sites (a Local WP install, an InstaWP sandbox) need to be added
// before they will render the widget. Set them from the Vercel dashboard as
// comma-separated origins rather than editing this file for every throwaway
// domain — e.g. "http://cruzroja.local,https://abc123.instawp.xyz". Scheme and
// port are part of the match; a redeploy is needed to pick the change up.
const EXTRA_FRAME_ANCESTORS = (process.env.EXTRA_FRAME_ANCESTORS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const FRAME_ANCESTORS = [
  "'self'",
  "https://cruzrojacdmx-edomex.org",
  "https://*.cruzrojacdmx-edomex.org",
  ...EXTRA_FRAME_ANCESTORS,
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
