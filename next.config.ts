import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Puppeteer PDF on Vercel: keep native chromium tarball resolvable at runtime */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  /**
   * NFT tracing often misses `@sparticuz/chromium`'s `bin/` tree (dynamic unpack path).
   * Include the full package so `/var/task/node_modules/@sparticuz/chromium/bin` exists on Vercel.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
   */
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
