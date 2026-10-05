import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { Fixture } from '@fixture-kit/core';

const execFileAsync = promisify(execFile);
const CLI_PATH = fileURLToPath(new URL('../dist/bin/index.mjs', import.meta.url));
const CORE_URL = new URL('../dist/core/index.mjs', import.meta.url).href;
const config = `import { codeownersJob } from ${JSON.stringify(CORE_URL)};
export default [codeownersJob()];
`;

function expectScriptConfigWarning(result: { stdout: string; stderr: string }, configPath: string) {
  expect(result.stderr).toBe(
    `[DEPRECATED] JavaScript/TypeScript configuration is deprecated: ${configPath}\n` +
      'Use pullup.yml or pullup.yaml for built-in jobs and external commands for custom transforms.\n' +
      'Migration guide: https://github.com/toss/pull-up#migration\n',
  );
  expect(result.stderr.match(/\[DEPRECATED\]/g)).toHaveLength(1);
  expect(result.stdout).not.toContain('[DEPRECATED]');
}

describe('codeowners-cli', () => {
  it.each([
    { name: 'the repository root', cwd: 'repo', explicitRoot: false },
    { name: 'a subdirectory', cwd: 'repo/services/auth', explicitRoot: false },
    {
      name: 'another repository with --root',
      cwd: 'other-repo',
      explicitRoot: true,
    },
    {
      name: 'a subdirectory selected with --cwd',
      cwd: 'other-repo',
      explicitRoot: false,
      explicitCwd: true,
    },
  ])('sync and check resolve CODEOWNERS paths from $name', async (scenario) => {
    await using fixture = await Fixture.fromDirectory(fileURLToPath(new URL('../fixtures/', import.meta.url)));
    const rootDir = path.join(fixture.root, 'repo');
    const subdirectory = path.join(rootDir, 'services/auth');
    const otherRoot = path.join(fixture.root, 'other-repo');

    await Promise.all([
      mkdir(path.join(rootDir, '.git'), { recursive: true }),
      mkdir(path.join(otherRoot, '.git'), { recursive: true }),
    ]);
    // Config discovery uses cwd independently of the repository root.
    for (const directory of [rootDir, subdirectory, otherRoot]) {
      await writeFile(path.join(directory, 'pullup.config.mjs'), config);
    }
    const options: string[] = [];
    if (scenario.explicitRoot) options.push('--root', rootDir);
    if (scenario.explicitCwd === true) options.push('--cwd', subdirectory);
    const configDirectory = scenario.explicitCwd === true ? subdirectory : path.join(fixture.root, scenario.cwd);
    const configPath = path.join(configDirectory, 'pullup.config.mjs');

    const sync = await execFileAsync(process.execPath, [CLI_PATH, 'sync', ...options], {
      cwd: path.join(fixture.root, scenario.cwd),
      timeout: 10_000,
    });
    expect(sync.stdout).toContain('codeowners synced');
    expectScriptConfigWarning(sync, configPath);

    expect(await readFile(path.join(rootDir, '.github/CODEOWNERS'), 'utf8')).toBe(
      '* @root-team\n' +
        '/docs/ @docs-team\n' +
        '/services/ads/ @ads-team\n' +
        '/services/ads/ads-platform/ @platform-team\n' +
        '/services/ads/ads-platform/special/ @special-team\n' +
        '/services/auth/ @auth-team\n' +
        '/services/auth/login/ @login-team\n' +
        '/services/auth/login/admin/ @admin-team\n' +
        '/services/auth-cert/ @cert-team\n' +
        '/services/builder/desktop/ @desktop-team\n' +
        '/services/builder/form/ @form-team\n' +
        '/services/cart/ @cart-team\n' +
        '/tools/catalog-cli/ @tools-team\n',
    );
    const check = await execFileAsync(process.execPath, [CLI_PATH, 'check', ...options], {
      cwd: path.join(fixture.root, scenario.cwd),
      timeout: 10_000,
    });
    expect(check.stdout).toContain('All files are up to date');
    expectScriptConfigWarning(check, configPath);

    if (scenario.explicitRoot || scenario.explicitCwd === true) {
      await expect(readFile(path.join(otherRoot, '.github/CODEOWNERS'), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    }
  });

  it.each([
    {
      name: './',
      input: ['services/auth/CODEOWNERS', './services/auth/login/CODEOWNERS'],
    },
    {
      name: '..',
      input: ['services/auth/CODEOWNERS', 'services/../services/auth/login/CODEOWNERS'],
    },
  ])('sync normalizes $name in CODEOWNERS input paths before sorting', async (scenario) => {
    await using fixture = await Fixture.fromDirectory(fileURLToPath(new URL('../fixtures/repo/', import.meta.url)));
    const rootDir = fixture.root;
    const customConfig = `import { codeownersJob } from ${JSON.stringify(CORE_URL)};
export default [codeownersJob({ input: ${JSON.stringify(scenario.input)} })];
`;

    await mkdir(path.join(rootDir, '.git'));
    await writeFile(path.join(rootDir, 'pullup.config.mjs'), customConfig);
    const sync = await execFileAsync(process.execPath, [CLI_PATH, 'sync'], {
      cwd: rootDir,
      timeout: 10_000,
    });

    expectScriptConfigWarning(sync, path.join(rootDir, 'pullup.config.mjs'));
    expect(await readFile(path.join(rootDir, '.github/CODEOWNERS'), 'utf8')).toBe(
      '/services/auth/ @auth-team\n' + '/services/auth/login/ @login-team\n',
    );
  });

  it('sync preserves unanchored patterns from root and nested CODEOWNERS files', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.config.mjs': config,
      CODEOWNERS: '*.js @root-team\n',
      packages: {
        web: {
          CODEOWNERS: '*.ts @frontend-team\ndocs/ @docs-team\n/docs/ @local-docs-team\nsrc/*.ts @source-team\n',
        },
      },
    });

    const sync = await execFileAsync(process.execPath, [CLI_PATH, 'sync'], { cwd: fixture.root, timeout: 10_000 });

    expect(sync.stdout).toContain('codeowners synced');
    expectScriptConfigWarning(sync, path.join(fixture.root, 'pullup.config.mjs'));
    expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(
      '*.js @root-team\n' +
        '/packages/web/**/*.ts @frontend-team\n' +
        '/packages/web/**/docs/ @docs-team\n' +
        '/packages/web/docs/ @local-docs-team\n' +
        '/packages/web/src/*.ts @source-team\n',
    );

    const check = await execFileAsync(process.execPath, [CLI_PATH, 'check'], { cwd: fixture.root, timeout: 10_000 });

    expect(check.stdout).toContain('All files are up to date');
    expectScriptConfigWarning(check, path.join(fixture.root, 'pullup.config.mjs'));
  });
});
