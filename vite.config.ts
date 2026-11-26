import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

// The test-version line (src/lib/build-info.ts). CI passes the PR head commit as BUILD_SHA;
// GITHUB_SHA on a PR is a temporary merge commit, so it is only the fallback.
const buildSha = process.env.BUILD_SHA || process.env.GITHUB_SHA || "local";

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildSha === "local" ? buildSha : buildSha.slice(0, 7)),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
