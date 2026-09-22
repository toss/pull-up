import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { codeownersJob } from "../dist/core/index.mjs";

test("merges parent CODEOWNERS before nested files", async () => {
  const rootDir = process.cwd();
  // Lexical path order places ads-platform/CODEOWNERS before ads/CODEOWNERS.
  const inputFiles = [
    {
      path: path.join(rootDir, "services/ads/ads-platform/CODEOWNERS"),
      contents: "* @platform-team\n/special/ @special-team\n",
    },
    {
      path: path.join(rootDir, "services/ads/CODEOWNERS"),
      contents: "* @ads-team\n",
    },
  ];

  const result = await codeownersJob().transform(inputFiles, {
    rootDir,
    outputPath: path.join(rootDir, ".github/CODEOWNERS"),
  });

  assert.equal(
    result,
    "/services/ads/ @ads-team\n" +
      "/services/ads/ads-platform/ @platform-team\n" +
      "/services/ads/ads-platform/special/ @special-team\n",
  );
});
