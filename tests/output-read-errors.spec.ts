import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { Fixture } from '@fixture-kit/core';

const execFileAsync = promisify(execFile);
const CLI_PATH = fileURLToPath(new URL('../dist/bin/index.mjs', import.meta.url));
const fixtureDirectory = fileURLToPath(new URL('../fixtures/repo/', import.meta.url));
const output = '.github/CODEOWNERS';
const existingContents = 'existing output\n';
const config = `export default [
  { name: 'writable', input: [], output: 'writable.txt', transform: () => 'updated output\\n' },
  { name: 'unreadable', input: [], output: '${output}', transform: () => 'generated output\\n' },
];
`;

async function prepareRepository(rootDir: string) {
  await mkdir(path.join(rootDir, '.git'));
  await mkdir(path.join(rootDir, '.github'), { recursive: true });
  await writeFile(path.join(rootDir, 'pullup.config.mjs'), config);
  await writeFile(path.join(rootDir, 'writable.txt'), existingContents);
}

function runCli(command: string, rootDir: string) {
  return execFileAsync(process.execPath, [CLI_PATH, command], {
    cwd: rootDir,
    timeout: 10_000,
  }).then(
    (result) => ({ ...result, code: 0 }),
    (error: { code: number; stdout: string; stderr: string }) => error,
  );
}

describe('output read errors', () => {
  it.each(['check', 'sync'])('%s reports an output directory without changing other outputs', async (command) => {
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    await prepareRepository(fixture.root);
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
      await using fixture = await Fixture.fromDirectory(fixtureDirectory);
      await prepareRepository(fixture.root);
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
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    await prepareRepository(fixture.root);

    const sync = await runCli('sync', fixture.root);

    expect(sync.code).toBe(0);
    expect(sync.stderr).toBe('');
    expect(sync.stdout).toContain('unreadable synced');
    expect(await readFile(path.join(fixture.root, output), 'utf8')).toBe('generated output\n');

    const check = await runCli('check', fixture.root);

    expect(check.code).toBe(0);
    expect(check.stderr).toBe('');
    expect(check.stdout).toContain('All files are up to date');
  });
});
