import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist (pulled in by PDFLoader) resolves its worker file relative to
  // its own location on disk. Bundling it into .next breaks that lookup with
  // "Setting up fake worker failed", so keep these in node_modules at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
