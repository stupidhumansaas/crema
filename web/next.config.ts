import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app/shell.html is read at build time by app/page.tsx
  outputFileTracingIncludes: { "/": ["./app/shell.html"] },
};

export default nextConfig;
