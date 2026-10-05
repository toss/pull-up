import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { runCli } from './run-cli';

const existingContents = '* @existing-team\n';
const config = `jobs:
  codeowners:
    type: codeowners
    input:
      - '**/CODEOWNERS'
      - '!**/fixtures/**'
    output: .github/CODEOWNERS
`;

describe('YAML config CLI', () => {
  it.each(['pullup.yaml', 'pullup.yml'])('syncs and checks a codeowners job from %s', async (filename) => {
    await using fixture = await Fixture.create({
      '.git': {},
      [filename]: config,
      '.github': { CODEOWNERS: existingContents },
      CODEOWNERS: '* @root-team\n',
      packages: {
        web: { CODEOWNERS: '*.ts @frontend-team\n' },
        fixtures: { CODEOWNERS: '* @ignored-team\n' },
      },
    });
    const outputPath = path.join(fixture.root, '.github/CODEOWNERS');

    const sync = await runCli('sync', fixture.root);

    expect(sync.code).toBe(0);
    expect(sync.stderr).toBe('');
    expect(sync.stdout).toBe('✔ codeowners synced\n');
    expect(await readFile(outputPath, 'utf8')).toBe('* @root-team\n/packages/web/**/*.ts @frontend-team\n');

    const check = await runCli('check', fixture.root);

    expect(check.code).toBe(0);
    expect(check.stderr).toBe('');
    expect(check.stdout).toBe('✔ All files are up to date\n');
  });

  it('previews sync --dry-run without changing the output', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': config,
      '.github': { CODEOWNERS: existingContents },
      CODEOWNERS: '* @root-team\n',
      packages: { web: { CODEOWNERS: '*.ts @frontend-team\n' } },
    });

    const result = await runCli('sync', fixture.root, ['--dry-run']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      '┌─ [Job] codeowners\n' +
        '│  Output: .github/CODEOWNERS\n' +
        '│\n' +
        '│  * @root-team\n' +
        '│  /packages/web/**/*.ts @frontend-team\n' +
        '│  \n' +
        '└─\n',
    );
    expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
  });

  it('fails an outdated check without changing the output', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': config,
      '.github': { CODEOWNERS: existingContents },
      CODEOWNERS: '* @source-team\n',
    });

    const result = await runCli('check', fixture.root);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe("✘ codeowners is outdated. Run 'pullup sync' to update.\n");
    expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
  });

  it('rejects malformed YAML without changing the output', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': 'jobs: [\n',
      '.github': { CODEOWNERS: existingContents },
      CODEOWNERS: '* @source-team\n',
    });

    const result = await runCli('sync', fixture.root);
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(1);
    expect(output).toContain('YAMLException');
    expect(output).toContain(path.join(fixture.root, 'pullup.yml'));
    expect(output).not.toContain('synced');
    expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
  });

  describe.each(['sync', 'check'])('%s', (command) => {
    it.each([
      { name: 'the nearest YAML in a subdirectory', cwd: 'repo/nested', output: 'nested-owners.txt' },
      { name: 'an ancestor YAML when the child has none', cwd: 'repo/nested/child', output: 'nested-owners.txt' },
      {
        name: 'the cwd YAML with a different --root',
        cwd: 'other-repo',
        output: 'other-owners.txt',
        explicitRoot: true,
      },
      {
        name: 'the YAML selected by --cwd',
        cwd: 'other-repo',
        output: 'nested-owners.txt',
        explicitCwd: true,
      },
    ])('uses $name while resolving input and output from the repository root', async (scenario) => {
      const generatedContents = '* @repo-team\n';
      await using fixture = await Fixture.create({
        repo: {
          '.git': {},
          'pullup.yaml':
            'jobs:\n  owners:\n    type: codeowners\n    input: [CODEOWNERS]\n    output: root-owners.txt\n',
          CODEOWNERS: generatedContents,
          'root-owners.txt': existingContents,
          'nested-owners.txt': existingContents,
          'other-owners.txt': existingContents,
          [scenario.output]: command === 'check' ? generatedContents : existingContents,
          nested: {
            'pullup.yml':
              'jobs:\n  owners:\n    type: codeowners\n    input: [CODEOWNERS]\n    output: nested-owners.txt\n',
            child: {},
          },
        },
        'other-repo': {
          '.git': {},
          'pullup.yml':
            'jobs:\n  owners:\n    type: codeowners\n    input: [CODEOWNERS]\n    output: other-owners.txt\n',
          CODEOWNERS: '* @other-team\n',
        },
      });
      const rootDir = path.join(fixture.root, 'repo');
      const args: string[] = [];
      if (scenario.explicitRoot === true) args.push('--root', rootDir);
      if (scenario.explicitCwd === true) args.push('--cwd', path.join(rootDir, 'nested'));

      const result = await runCli(command, path.join(fixture.root, scenario.cwd), args);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe(command === 'sync' ? '✔ codeowners synced\n' : '✔ All files are up to date\n');
      for (const output of ['root-owners.txt', 'nested-owners.txt', 'other-owners.txt']) {
        expect(await readFile(path.join(rootDir, output), 'utf8')).toBe(
          output === scenario.output ? generatedContents : existingContents,
        );
      }
      await expect(readFile(path.join(fixture.root, 'other-repo', scenario.output), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    });

    it('uses YAML while ignoring script configs and package config overrides', async () => {
      const generatedContents = '* @yaml-team\n';
      await using fixture = await Fixture.create({
        '.git': {},
        'pullup.yml': config,
        'pullup.config.ts': 'throw new Error("Legacy config executed");\n',
        '.config': { 'config.ts': 'throw new Error("Meta config executed");\n' },
        'package.json': JSON.stringify({
          pullup: [{ name: 'legacy', input: [], output: 'legacy-output.txt' }],
          cosmiconfig: { searchPlaces: ['pullup.config.ts'], mergeSearchPlaces: false },
        }),
        CODEOWNERS: generatedContents,
        '.github': { CODEOWNERS: command === 'check' ? generatedContents : existingContents },
      });

      const result = await runCli(command, fixture.root);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe(command === 'sync' ? '✔ codeowners synced\n' : '✔ All files are up to date\n');
      expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(generatedContents);
      await expect(readFile(path.join(fixture.root, 'legacy-output.txt'), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    });

    it.each([
      { name: 'an empty jobs array', config: 'jobs: []\n' },
      { name: 'a nonempty jobs array', config: 'jobs:\n  - type: codeowners\n' },
    ])('rejects $name without changing the output', async (scenario) => {
      await using fixture = await Fixture.create({
        '.git': {},
        'pullup.yml': scenario.config,
        '.github': { CODEOWNERS: existingContents },
        CODEOWNERS: '* @source-team\n',
      });

      const result = await runCli(command, fixture.root);
      const output = result.stdout + result.stderr;

      expect(result.code).toBe(1);
      expect(output).toContain('jobs must be an object.');
      expect(output).not.toContain('synced');
      expect(output).not.toContain('All files are up to date');
      expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
    });

    it.each(
      ['constructor', 'prototype', '__proto__'].flatMap((key) => [
        {
          name: `a ${key} job`,
          config: `jobs:\n  ${key}:\n    type: codeowners\n`,
        },
        {
          name: `a ${key} job alongside an owners job`,
          config: `jobs:\n  owners:\n    type: codeowners\n    output: .github/CODEOWNERS\n  ${key}:\n    type: codeowners\n`,
        },
      ]),
    )('rejects $name without changing the output', async (scenario) => {
      await using fixture = await Fixture.create({
        '.git': {},
        'pullup.yml': scenario.config,
        '.github': { CODEOWNERS: existingContents },
        CODEOWNERS: '* @source-team\n',
      });

      const result = await runCli(command, fixture.root);
      const output = result.stdout + result.stderr;

      expect(result.code).toBe(1);
      expect(output).toContain('jobs must not use constructor, prototype, or __proto__ as keys.');
      expect(output).not.toContain('synced');
      expect(output).not.toContain('All files are up to date');
      expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
    });

    it('succeeds without a config and leaves the output unchanged', async () => {
      await using fixture = await Fixture.create({
        '.git': {},
        '.github': { CODEOWNERS: existingContents },
      });

      const result = await runCli(command, fixture.root);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(`No jobs found to ${command}`);
      expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(existingContents);
    });
  });
});
