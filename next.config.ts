import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Puppeteer PDF on Vercel: keep native chromium tarball resolvable at runtime */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
