import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { Fixture } from "@fixture-kit/core";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(
  new URL("../dist/bin/index.mjs", import.meta.url),
);
const coreUrl = new URL("../dist/core/index.mjs", import.meta.url).href;
const config = `import { codeownersJob } from ${JSON.stringify(coreUrl)};
export default [codeownersJob()];
`;

for (const scenario of [
  { name: "the repository root", cwd: "repo", explicitRoot: false },
  { name: "a subdirectory", cwd: "repo/services/auth", explicitRoot: false },
  {
    name: "another repository with --root",
    cwd: "other-repo",
    explicitRoot: true,
  },
]) {
  test(`sync resolves CODEOWNERS paths from ${scenario.name}`, async () => {
    await using fixture = await Fixture.fromDirectory(
      fileURLToPath(new URL("./fixtures/", import.meta.url)),
    );
    const rootDir = path.join(fixture.root, "repo");
    const subdirectory = path.join(rootDir, "services/auth");
    const otherRoot = path.join(fixture.root, "other-repo");

    await Promise.all([
      mkdir(path.join(rootDir, ".git"), { recursive: true }),
      mkdir(path.join(otherRoot, ".git"), { recursive: true }),
    ]);
    // Config discovery uses cwd independently of the repository root.
    for (const directory of [rootDir, subdirectory, otherRoot]) {
      await writeFile(path.join(directory, "pullup.config.mjs"), config);
    }
    const args = [cliPath, "sync"];
    if (scenario.explicitRoot) args.push("--root", rootDir);

    await execFileAsync(process.execPath, args, {
      cwd: path.join(fixture.root, scenario.cwd),
      timeout: 10_000,
    });

    assert.equal(
      await readFile(path.join(rootDir, ".github/CODEOWNERS"), "utf8"),
      "/ @root-team\n" +
        "/docs/ @docs-team\n" +
        "/services/ads/ @ads-team\n" +
        "/services/ads/ads-platform/ @platform-team\n" +
        "/services/ads/ads-platform/special/ @special-team\n" +
        "/services/auth/ @auth-team\n" +
        "/services/auth/login/ @login-team\n" +
        "/services/auth/login/admin/ @admin-team\n" +
        "/services/auth-cert/ @cert-team\n" +
        "/services/builder/desktop/ @desktop-team\n" +
        "/services/builder/form/ @form-team\n" +
        "/services/cart/ @cart-team\n" +
        "/tools/catalog-cli/ @tools-team\n",
    );
    if (scenario.explicitRoot) {
      await assert.rejects(
        readFile(path.join(otherRoot, ".github/CODEOWNERS"), "utf8"),
        { code: "ENOENT" },
      );
    }
  });
}

for (const scenario of [
  {
    name: "./",
    input: ["services/auth/CODEOWNERS", "./services/auth/login/CODEOWNERS"],
  },
  {
    name: "..",
    input: [
      "services/auth/CODEOWNERS",
      "services/../services/auth/login/CODEOWNERS",
    ],
  },
]) {
  test(`sync normalizes ${scenario.name} in CODEOWNERS input paths before sorting`, async () => {
    await using fixture = await Fixture.fromDirectory(
      fileURLToPath(new URL("./fixtures/repo/", import.meta.url)),
    );
    const rootDir = fixture.root;
    const customConfig = `import { codeownersJob } from ${JSON.stringify(coreUrl)};
export default [codeownersJob({ input: ${JSON.stringify(scenario.input)} })];
`;

    await mkdir(path.join(rootDir, ".git"));
    await writeFile(path.join(rootDir, "pullup.config.mjs"), customConfig);
    await execFileAsync(process.execPath, [cliPath, "sync"], {
      cwd: rootDir,
      timeout: 10_000,
    });

    assert.equal(
      await readFile(path.join(rootDir, ".github/CODEOWNERS"), "utf8"),
      "/services/auth/ @auth-team\n" + "/services/auth/login/ @login-team\n",
    );
  });
}
