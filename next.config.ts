import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default function config(phase: string): NextConfig {
  // Generate public/sitemap.xml at the start of every production build so it
  // is copied into out/ regardless of how the build was started. An npm
  // "postbuild" hook only runs for `npm run build`, not `npx next build`
  // (which is what Cloudflare Pages was running). The env flag keeps build
  // workers that reload this config from regenerating it.
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.CV_SITEMAP_GENERATED) {
    execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "generate-sitemap.js")], {
      stdio: "inherit",
    });
    process.env.CV_SITEMAP_GENERATED = "1";
  }
  return nextConfig;
}
