import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/cli/index.ts",
  banner: "#!/usr/bin/env node",
  dts: false,
  minify: true,
  noExternal: ["clipanion", "picocolors", "fast-glob", "find-up"],
});
