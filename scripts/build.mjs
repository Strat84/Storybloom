// Production build: client bundle, server-render bundle, then static prerender.
//
//   dist/public/   upload this folder to the S3 bucket behind storybloom.ai
//   dist/server/   build-time only (used to prerender), not deployed

import path from "node:path";
import { build } from "vite";

process.env.NODE_ENV = "production";
process.env.BUILD_TIME = new Date().toISOString();

const root = path.resolve(import.meta.dirname, "..");
const configFile = path.join(root, "vite.config.ts");

await build({ configFile, mode: "production" });
await build({
  configFile,
  mode: "production",
  build: {
    ssr: path.join(root, "client/src/entry-server.tsx"),
    outDir: path.join(root, "dist/server"),
    emptyOutDir: true,
    copyPublicDir: false,
  },
});

await import("./prerender.mjs");
