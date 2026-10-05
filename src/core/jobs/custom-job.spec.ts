import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Fixture } from '@fixture-kit/core';

import { runJob } from '../run-job';
import { customJob } from './custom-job';

const nodeCommand = `'${process.execPath.replaceAll("'", "'\\''")}'`;
const ownershipFixtureDirectory = fileURLToPath(new URL('../../../fixtures/custom-job/ownership/', import.meta.url));

describe('customJob', () => {
  it('passes sources and context on stdin and preserves stdout', async () => {
    await using fixture = await Fixture.create({
      'transform.mjs': String.raw`
import { readFileSync } from 'node:fs';

const request = JSON.parse(readFileSync(0, 'utf8'));
process.stderr.write('diagnostic\n');
process.stdout.write(JSON.stringify({ request, cwd: process.cwd() }) + '\r\n\n');
`,
    });
    const rootDir = await realpath(fixture.root);
    const sources = [{ path: 'packages/core/config.json', contents: '{"name":"코어"}\r\n' }];
    const context = { rootDir, outputPath: path.join(rootDir, 'merged-config.json') };
    const job = customJob({ command: `${nodeCommand} 'transform.mjs'`, output: 'merged-config.json' });

    const result = await job.transform(sources, context);

    expect(result).toBe(JSON.stringify({ request: { sources, context }, cwd: rootDir }) + '\r\n\n');
  });

  it('resolves people, teams and folder rules when generating CODEOWNERS', async () => {
    await using fixture = await Fixture.fromDirectory(ownershipFixtureDirectory);
    const rootDir = await realpath(fixture.root);
    const scriptPath = path.join(ownershipFixtureDirectory, 'generate-codeowners.mjs');
    const job = customJob({
      command: `${nodeCommand} '${scriptPath.replaceAll("'", "'\\''")}'`,
      input: ['codeowners.yaml', 'packages/**/ownership.yaml'],
      output: '.github/CODEOWNERS',
    });

    const result = await runJob(job, rootDir);

    expect(result.generated).toEqual({
      path: path.join(rootDir, '.github/CODEOWNERS'),
      contents:
        '/packages/core/ @alice-dev @bob-dev\n' +
        '/packages/web/ @carol-dev\n' +
        '/packages/core/child/ @bob-dev\n' +
        '/packages/core/feature/ @carol-dev\n' +
        '/packages/core/feature/details/ @bob-dev\n',
    });
  });

  it('rejects with the exit code and stderr when the command fails', async () => {
    await using fixture = await Fixture.create({
      'transform.mjs': String.raw`
import { readFileSync } from 'node:fs';

readFileSync(0, 'utf8');
process.stdout.write('partial output\n');
process.stderr.write('transform failed\n');
process.exitCode = 7;
`,
    });
    const rootDir = await realpath(fixture.root);
    const context = { rootDir, outputPath: path.join(rootDir, 'merged-config.json') };
    const job = customJob({ command: `${nodeCommand} 'transform.mjs'`, output: 'merged-config.json' });

    await expect(job.transform([], context)).rejects.toMatchObject({
      exitCode: 7,
      stderr: 'transform failed\n',
    });
  });
});
