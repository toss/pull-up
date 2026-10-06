import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { runCli } from './run-cli';

const output = '.github/CODEOWNERS';
const existingContents = 'existing output\n';
const config = String.raw`jobs:
  writable:
    type: custom
    output: writable.txt
    command: >-
      IFS= read -r request || :; printf 'updated output\n'
  unreadable:
    type: custom
    output: .github/CODEOWNERS
    command: >-
      IFS= read -r request || :; printf 'generated output\n'
`;

function createRepository() {
  return Fixture.create({
    '.git': {},
    '.github': {},
    'pullup.yml': config,
    'writable.txt': existingContents,
  });
}

describe('output read errors', () => {
  it.each(['check', 'sync'])('%s reports an output directory without changing other outputs', async (command) => {
    await using fixture = await createRepository();
    const outputPath = path.join(fixture.root, output);
    await mkdir(outputPath);

    const result = await runCli(command, fixture.root);

    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toContain('EISDIR');
    expect(result.stdout + result.stderr).toContain(outputPath);
    expect(result.stdout + result.stderr).not.toContain('outdated');
    expect(result.stdout + result.stderr).not.toContain('pullup sync');
    expect(result.stdout + result.stderr).not.toContain('synced');
    expect((await stat(outputPath)).isDirectory()).toBe(true);
    expect(await readFile(path.join(fixture.root, 'writable.txt'), 'utf8')).toBe(existingContents);
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0).each(['check', 'sync'])(
    '%s reports an unreadable but writable output without overwriting it',
    async (command) => {
      await using fixture = await createRepository();
      const outputPath = path.join(fixture.root, output);
      await writeFile(outputPath, existingContents);
      await chmod(outputPath, 0o200);

      try {
        const result = await runCli(command, fixture.root);

        expect(result.code).toBe(1);
        expect(result.stdout + result.stderr).toContain('EACCES');
        expect(result.stdout + result.stderr).toContain(outputPath);
        expect(result.stdout + result.stderr).not.toContain('outdated');
        expect(result.stdout + result.stderr).not.toContain('pullup sync');
        expect(result.stdout + result.stderr).not.toContain('synced');
        expect(await readFile(path.join(fixture.root, 'writable.txt'), 'utf8')).toBe(existingContents);
      } finally {
        await chmod(outputPath, 0o600);
      }

      expect(await readFile(outputPath, 'utf8')).toBe(existingContents);
    },
  );

  it('still creates missing outputs and checks their generated contents', async () => {
    await using fixture = await createRepository();

    const sync = await runCli('sync', fixture.root);

    expect(sync.code).toBe(0);
    expect(sync.stderr).toBe('');
    expect(sync.stdout).toContain('custom synced');
    expect(await readFile(path.join(fixture.root, output), 'utf8')).toBe('generated output\n');

    const check = await runCli('check', fixture.root);

    expect(check.code).toBe(0);
    expect(check.stderr).toBe('');
    expect(check.stdout).toContain('All files are up to date');
  });
});
