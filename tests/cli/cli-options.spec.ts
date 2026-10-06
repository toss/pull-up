import { Fixture } from '@fixture-kit/core';

import packageJson from '../../package.json' with { type: 'json' };
import { runCli } from './run-cli';

describe('CLI options', () => {
  it('shows help without a repository or config', async () => {
    await using fixture = await Fixture.create({});

    const result = await runCli('--help', fixture.root);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('pullup');
    expect(result.stdout).toContain('pullup sync');
    expect(result.stdout).toContain('pullup check');
  });

  it('shows the package version without a repository or config', async () => {
    await using fixture = await Fixture.create({});

    const result = await runCli('--version', fixture.root);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(`${packageJson.version}\n`);
  });
});
