import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { devNull } from 'node:os';
import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { codeownersJob } from './codeowners-job';

const sourceDir = 'packages/web';
const sourceFiles = [
  'index.ts',
  'index.js',
  'src/index.ts',
  'src/nested/index.ts',
  'lib/src/index.ts',
  'docs/readme.md',
  'docs/deep/readme.md',
  'src/docs/readme.md',
  'src/docs/deep/readme.md',
  'file-only/docs',
];
const outsideFiles = [
  'index.ts',
  'docs/readme.md',
  'packages/mobile/src/index.ts',
  'packages/web-other/docs/readme.md',
];
const allFiles = [...sourceFiles.map((file) => `${sourceDir}/${file}`), ...outsideFiles];

function matchedFiles(rootDir: string) {
  const result = spawnSync(
    'git',
    [
      '-c',
      `core.excludesFile=${devNull}`,
      '-c',
      'core.ignoreCase=false',
      'check-ignore',
      '--no-index',
      '--',
      ...allFiles,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  expect(result.error).toBeUndefined();
  expect([0, 1]).toContain(result.status);
  return result.stdout.trim().split('\n').filter(Boolean).sort();
}

// CODEOWNERS follows gitignore's pattern scoping for these supported patterns.
// Compare relocation against Git itself rather than a copy of the rewrite logic.
// Negation, character ranges, and Git's excluded-directory precedence are not tested here.
describe('CODEOWNERS pattern scope', () => {
  it.each([
    '*.ts',
    '/*.ts',
    'docs/',
    '/docs/',
    'docs',
    'src/*.ts',
    '/src/*.ts',
    'src/docs/',
    '**/docs/',
    'src/**/index.ts',
    '*',
  ])('preserves files matched by %s without escaping the source subtree', async (pattern) => {
    await using fixture = await Fixture.create({});
    const rootDir = fixture.root;
    const init = spawnSync('git', ['init', '--quiet', '--template='], { cwd: rootDir, encoding: 'utf8' });
    expect(init.error).toBeUndefined();
    expect(init.status).toBe(0);
    await Promise.all(
      allFiles.map(async (file) => {
        const filePath = path.join(rootDir, file);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, '');
      }),
    );

    const originalIgnore = path.join(rootDir, sourceDir, '.gitignore');
    await writeFile(originalIgnore, `${pattern}\n`);
    const originalMatches = matchedFiles(rootDir);
    expect(originalMatches.length).toBeGreaterThan(0);
    await rm(originalIgnore);

    const result = await codeownersJob().transform(
      [{ path: `${sourceDir}/CODEOWNERS`, contents: `${pattern} @frontend-team\n` }],
      { rootDir, outputPath: path.join(rootDir, '.github/CODEOWNERS') },
    );
    await writeFile(path.join(rootDir, '.gitignore'), `${result.trim().split(' ')[0]}\n`);
    const relocatedMatches = matchedFiles(rootDir);

    expect(relocatedMatches).toEqual(originalMatches);
    expect(relocatedMatches.every((file) => file.startsWith(`${sourceDir}/`))).toBe(true);
  });
});
