import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { runCli } from './run-cli';

const sourceContents = '한글 source\r\n';
const existingContents = 'existing output\n';
const config = String.raw`jobs:
  custom:
    type: custom
    input: ['source.txt']
    output: generated.txt
    command: >-
      IFS= read -r request || :; printf '%s\r\n\n' "$request"
`;
const generatedOutput = 'custom generated output\n';
const fixedConfig = String.raw`jobs:
  custom:
    type: custom
    output: generated.txt
    command: printf '%s\n' 'custom generated output'
`;

describe('custom command CLI', () => {
  it.each([
    { name: 'repository discovery', args: [] },
    { name: 'relative --root with another --cwd', args: ['--root', '.', '--cwd', 'nested'] },
  ])('passes sources and absolute context on stdin and preserves stdout with $name', async ({ args }) => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': args.length === 0 ? config : config.replace('output: generated.txt', 'output: root-generated.txt'),
      'source.txt': sourceContents,
      'generated.txt': existingContents,
      nested: { 'pullup.yml': config },
    });
    const outputPath = path.join(fixture.root, 'generated.txt');
    const generatedContents =
      JSON.stringify({
        sources: [{ path: 'source.txt', contents: sourceContents }],
        context: { rootDir: fixture.root, outputPath },
      }) + '\r\n\n';

    const sync = await runCli('sync', fixture.root, args);

    expect(sync.code).toBe(0);
    expect(sync.stdout).toBe('✔ custom synced\n');
    expect(sync.stderr).toBe('');
    expect(await readFile(outputPath, 'utf8')).toBe(generatedContents);

    const check = await runCli('check', fixture.root, args);

    expect(check.code).toBe(0);
    expect(check.stdout).toBe('✔ All files are up to date\n');
    expect(check.stderr).toBe('');
    expect(await readFile(outputPath, 'utf8')).toBe(generatedContents);
    await expect(readFile(path.join(fixture.root, 'root-generated.txt'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('previews a custom command without changing the output', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': fixedConfig,
      'generated.txt': existingContents,
    });

    const result = await runCli('sync', fixture.root, ['--dry-run']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      '┌─ [Job] custom\n' +
        '│  Output: generated.txt\n' +
        '│\n' +
        `│  ${generatedOutput.trimEnd()}\n` +
        '│  \n' +
        '└─\n',
    );
    expect(await readFile(path.join(fixture.root, 'generated.txt'), 'utf8')).toBe(existingContents);
  });

  it('fails an outdated custom check without changing the output', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': fixedConfig,
      'generated.txt': existingContents,
    });

    const result = await runCli('check', fixture.root);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe("✘ custom is outdated. Run 'pullup sync' to update.\n");
    expect(await readFile(path.join(fixture.root, 'generated.txt'), 'utf8')).toBe(existingContents);
  });

  it('writes empty stdout without adding a newline', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': config.replace(/printf .+/, ':'),
      'source.txt': sourceContents,
      'generated.txt': existingContents,
    });

    const result = await runCli('sync', fixture.root);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('✔ custom synced\n');
    expect(result.stderr).toBe('');
    expect(await readFile(path.join(fixture.root, 'generated.txt'), 'utf8')).toBe('');
  });

  it('reports a failed command without writing its partial stdout', async () => {
    await using fixture = await Fixture.create({
      '.git': {},
      'pullup.yml': String.raw`jobs:
  custom:
    type: custom
    input: ['source.txt']
    output: generated.txt
    command: >-
      IFS= read -r request || :; printf '%s' 'partial output'; printf '%s\n' 'custom transform failed' >&2; exit 7
`,
      'source.txt': sourceContents,
      'generated.txt': existingContents,
    });

    const result = await runCli('sync', fixture.root);
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(1);
    expect(output).toContain('exit code 7');
    expect(output).toContain('custom transform failed');
    expect(output).not.toContain('synced');
    expect(await readFile(path.join(fixture.root, 'generated.txt'), 'utf8')).toBe(existingContents);
  });
});
