import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { Fixture } from '@fixture-kit/core';

const execFileAsync = promisify(execFile);
const CLI_PATH = fileURLToPath(new URL('../dist/bin/index.mjs', import.meta.url));
const existingContents = '* @existing-team\n';
const generatedContents = 'custom generated output\n';
const scriptConfig = `export default [
  { name: 'custom', input: [], output: '.github/CODEOWNERS', transform: () => ${JSON.stringify(generatedContents)} },
];
`;
const config = `jobs:
  codeowners:
    type: codeowners
    input:
      - '**/CODEOWNERS'
      - '!**/fixtures/**'
    output: .github/CODEOWNERS
`;

function runCli(command: string, rootDir: string) {
  return execFileAsync(process.execPath, [CLI_PATH, command], {
    cwd: rootDir,
    timeout: 10_000,
  }).then(
    (result) => ({ ...result, code: 0 }),
    (error: { code: number; stdout: string; stderr: string }) => error,
  );
}

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
    expect(sync.stdout).toContain('codeowners synced');
    expect(await readFile(outputPath, 'utf8')).toBe('* @root-team\n/packages/web/**/*.ts @frontend-team\n');

    const check = await runCli('check', fixture.root);

    expect(check.code).toBe(0);
    expect(check.stderr).toBe('');
    expect(check.stdout).toContain('All files are up to date');
  });

  describe.each(['sync', 'check'])('%s', (command) => {
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

    it('uses pullup.config.mjs before pullup.yml', async () => {
      await using fixture = await Fixture.create({
        '.git': {},
        'pullup.config.mjs': scriptConfig,
        'pullup.yml': 'jobs: []\n',
        '.github': { CODEOWNERS: generatedContents },
      });

      const result = await runCli(command, fixture.root);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(command === 'sync' ? 'custom synced' : 'All files are up to date');
      expect(await readFile(path.join(fixture.root, '.github/CODEOWNERS'), 'utf8')).toBe(generatedContents);
    });
  });
});
