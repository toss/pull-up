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

test("keeps each directory subtree together with parents first", async () => {
  const rootDir = process.cwd();
  const inputFiles = [
    {
      path: path.join(rootDir, "tools/catalog-cli/CODEOWNERS"),
      contents: "* @tools-team\n",
    },
    {
      path: path.join(rootDir, "services/auth-cert/CODEOWNERS"),
      contents: "* @cert-team\n",
    },
    {
      path: path.join(rootDir, "services/auth/login/admin/CODEOWNERS"),
      contents: "* @admin-team\n",
    },
    {
      path: path.join(rootDir, "services/auth/login/CODEOWNERS"),
      contents: "* @login-team\n",
    },
    {
      path: path.join(rootDir, "services/auth/CODEOWNERS"),
      contents: "* @auth-team\n",
    },
    {
      path: path.join(rootDir, "CODEOWNERS"),
      contents: "* @root-team\n",
    },
  ];

  const result = await codeownersJob().transform(inputFiles, {
    rootDir,
    outputPath: path.join(rootDir, ".github/CODEOWNERS"),
  });

  assert.equal(
    result,
    "/ @root-team\n" +
      "/services/auth/ @auth-team\n" +
      "/services/auth/login/ @login-team\n" +
      "/services/auth/login/admin/ @admin-team\n" +
      "/services/auth-cert/ @cert-team\n" +
      "/tools/catalog-cli/ @tools-team\n",
  );
});

test("groups nested directories even when their parent has no CODEOWNERS", async () => {
  const rootDir = process.cwd();
  const inputFiles = [
    {
      path: path.join(rootDir, "tools/catalog-cli/CODEOWNERS"),
      contents: "* @tools-team\n",
    },
    {
      path: path.join(rootDir, "services/cart/CODEOWNERS"),
      contents: "* @cart-team\n",
    },
    {
      path: path.join(rootDir, "services/builder/form/CODEOWNERS"),
      contents: "* @form-team\n",
    },
    {
      path: path.join(rootDir, "services/builder/desktop/CODEOWNERS"),
      contents: "* @desktop-team\n",
    },
  ];

  const result = await codeownersJob().transform(inputFiles, {
    rootDir,
    outputPath: path.join(rootDir, ".github/CODEOWNERS"),
  });

  assert.equal(
    result,
    "/services/builder/desktop/ @desktop-team\n" +
      "/services/builder/form/ @form-team\n" +
      "/services/cart/ @cart-team\n" +
      "/tools/catalog-cli/ @tools-team\n",
  );
});

test("resolves CODEOWNERS paths against rootDir when running from a subdirectory", async () => {
  // Treat cwd as a subdirectory of the configured repository root.
  const rootDir = path.dirname(process.cwd());
  const inputFiles = [
    {
      path: "services/auth/login/CODEOWNERS",
      contents: "* @login-team\n",
    },
    {
      path: path.join(rootDir, "tools/catalog-cli/CODEOWNERS"),
      contents: "* @tools-team\n",
    },
    {
      path: "services/auth/CODEOWNERS",
      contents: "* @auth-team\n",
    },
    {
      path: "CODEOWNERS",
      contents: "* @root-team\n",
    },
  ];

  const result = await codeownersJob().transform(inputFiles, {
    rootDir,
    outputPath: path.join(rootDir, ".github/CODEOWNERS"),
  });

  assert.equal(
    result,
    "/ @root-team\n" +
      "/services/auth/ @auth-team\n" +
      "/services/auth/login/ @login-team\n" +
      "/tools/catalog-cli/ @tools-team\n",
  );
});
