import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Fixture } from '@fixture-kit/core';

import { runCli } from './run-cli';

const config = `jobs:
  codeowners:
    type: codeowners
`;

describe('codeowners-cli', () => {
  it.each([
    { name: 'the repository root', cwd: 'repo', output: 'root-CODEOWNERS', explicitRoot: false },
    {
      name: 'a subdirectory',
      cwd: 'repo/services/auth',
      output: 'nested-CODEOWNERS',
      explicitRoot: false,
    },
    {
      name: 'another repository with --root',
      cwd: 'other-repo',
      output: 'other-CODEOWNERS',
      explicitRoot: true,
    },
    {
      name: 'a subdirectory selected with --cwd',
      cwd: 'other-repo',
      output: 'nested-CODEOWNERS',
      explicitRoot: false,
      explicitCwd: true,
    },
  ])('sync and check resolve CODEOWNERS paths from $name', async (scenario) => {
    await using fixture = await Fixture.fromDirectory(fileURLToPath(new URL('../../fixtures/', import.meta.url)));
    const rootDir = path.join(fixture.root, 'repo');
    const subdirectory = path.join(rootDir, 'services/auth');
    const otherRoot = path.join(fixture.root, 'other-repo');

    await Promise.all([
      mkdir(path.join(rootDir, '.git'), { recursive: true }),
      mkdir(path.join(otherRoot, '.git'), { recursive: true }),
    ]);
    for (const { directory, output } of [
      { directory: rootDir, output: 'root-CODEOWNERS' },
      { directory: subdirectory, output: 'nested-CODEOWNERS' },
      { directory: otherRoot, output: 'other-CODEOWNERS' },
    ]) {
      await writeFile(path.join(directory, 'pullup.yml'), `${config}    output: .github/${output}\n`);
    }
    const options: string[] = [];
    if (scenario.explicitRoot) options.push('--root', rootDir);
    if (scenario.explicitCwd === true) options.push('--cwd', subdirectory);
    const sync = await runCli('sync', path.join(fixture.root, scenario.cwd), options);
    expect(sync.code).toBe(0);
    expect(sync.stdout).toContain('codeowners synced');
    expect(sync.stderr).toBe('');

    expect(await readFile(path.join(rootDir, '.github', scenario.output), 'utf8')).toBe(
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
    const check = await runCli('check', path.join(fixture.root, scenario.cwd), options);
    expect(check.code).toBe(0);
    expect(check.stdout).toContain('All files are up to date');
    expect(check.stderr).toBe('');

    for (const output of ['root-CODEOWNERS', 'nested-CODEOWNERS', 'other-CODEOWNERS']) {
      if (output === scenario.output) continue;
      await expect(readFile(path.join(rootDir, '.github', output), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    }
    if (scenario.explicitRoot || scenario.explicitCwd === true) {
      await expect(readFile(path.join(otherRoot, '.github', scenario.output), 'utf8')).rejects.toMatchObject({
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
    await using fixture = await Fixture.fromDirectory(fileURLToPath(new URL('../../fixtures/repo/', import.meta.url)));
    const rootDir = fixture.root;
    const customConfig = `jobs:
  codeowners:
    type: codeowners
    input: ${JSON.stringify(scenario.input)}
`;

    await mkdir(path.join(rootDir, '.git'));
    await writeFile(path.join(rootDir, 'pullup.yml'), customConfig);
    const sync = await runCli('sync', rootDir);

    expect(sync.code).toBe(0);
    expect(sync.stderr).toBe('');
    expect(await readFile(path.join(rootDir, '.github/CODEOWNERS'), 'utf8')).toBe(
      '/services/auth/ @auth-team\n' + '/services/auth/login/ @login-team\n',
    );
  });

  it('sync preserves unanchored patterns from root and nested CODEOWNERS files', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': config,
      CODEOWNERS: '*.js @root-team\n',
      packages: {
        web: {
          CODEOWNERS: '*.ts @frontend-team\ndocs/ @docs-team\n/docs/ @local-docs-team\nsrc/*.ts @source-team\n',
        },
      },
    });

    const sync = await runCli('sync', fixture.root);

    expect(sync.code).toBe(0);
    expect(sync.stdout).toContain('codeowners synced');
    expect(sync.stderr).toBe('');
    expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(
      '*.js @root-team\n' +
        '/packages/web/**/*.ts @frontend-team\n' +
        '/packages/web/**/docs/ @docs-team\n' +
        '/packages/web/docs/ @local-docs-team\n' +
        '/packages/web/src/*.ts @source-team\n',
    );

    const check = await runCli('check', fixture.root);

    expect(check.code).toBe(0);
    expect(check.stdout).toContain('All files are up to date');
    expect(check.stderr).toBe('');
  });
});
