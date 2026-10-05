import { chmod } from 'node:fs/promises';
import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { resolveConfig } from './resolve-config';

const defaultYamlConfig = `jobs:
  owners:
    type: codeowners
`;

describe('resolveConfig', () => {
  it.each(['pullup.yaml', 'pullup.yml'])('resolves default codeowners options from %s', async (filename) => {
    await using fixture = await Fixture.create({ [filename]: defaultYamlConfig });

    expect(await resolveConfig(fixture.root)).toEqual([
      {
        name: 'codeowners',
        input: ['**/CODEOWNERS'],
        output: '.github/CODEOWNERS',
        transform: expect.any(Function),
      },
    ]);
  });

  it('resolves explicit input and output from pullup.yaml', async () => {
    await using fixture = await Fixture.create({
      'pullup.yaml': `jobs:
  packages:
    type: codeowners
    input:
      - 'packages/**/CODEOWNERS'
      - '!packages/fixtures/**'
    output: .github/CODEOWNERS
  docs:
    type: codeowners
    input:
      - 'docs/**/CODEOWNERS'
    output: docs/CODEOWNERS
`,
    });

    expect(await resolveConfig(fixture.root)).toEqual([
      {
        name: 'codeowners',
        input: ['packages/**/CODEOWNERS', '!packages/fixtures/**'],
        output: '.github/CODEOWNERS',
        transform: expect.any(Function),
      },
      {
        name: 'codeowners',
        input: ['docs/**/CODEOWNERS'],
        output: 'docs/CODEOWNERS',
        transform: expect.any(Function),
      },
    ]);
  });

  it('resolves an external custom command from YAML', async () => {
    await using fixture = await Fixture.create({
      'pullup.yml': `jobs:
  custom:
    type: custom
    input: ['packages/*/config.json']
    output: merged-config.json
    command: printf generated
`,
    });

    expect(await resolveConfig(fixture.root)).toEqual([
      {
        name: 'custom',
        input: ['packages/*/config.json'],
        output: 'merged-config.json',
        transform: expect.any(Function),
      },
    ]);
  });

  it('returns no jobs for an empty jobs mapping', async () => {
    await using fixture = await Fixture.create({ 'pullup.yml': 'jobs: {}\n' });

    expect(await resolveConfig(fixture.root)).toEqual([]);
  });

  it('returns no jobs when no config exists', async () => {
    await using fixture = await Fixture.create({});

    expect(await resolveConfig(fixture.root)).toEqual([]);
  });

  it('skips a directory named pullup.yaml before trying pullup.yml', async () => {
    await using fixture = await Fixture.create({
      'pullup.yaml': {},
      'pullup.yml': defaultYamlConfig,
    });

    expect(await resolveConfig(fixture.root)).toMatchObject([{ name: 'codeowners' }]);
  });

  it('skips an unreadable pullup.yaml before trying pullup.yml', async () => {
    await using fixture = await Fixture.create({
      'pullup.yaml': defaultYamlConfig,
      'pullup.yml': `${defaultYamlConfig}    output: readable/CODEOWNERS\n`,
    });
    const unreadablePath = path.join(fixture.root, 'pullup.yaml');
    await chmod(unreadablePath, 0);
    try {
      expect(await resolveConfig(fixture.root)).toMatchObject([{ output: 'readable/CODEOWNERS' }]);
    } finally {
      await chmod(unreadablePath, 0o644);
    }
  });

  it('finds an ancestor YAML from a subdirectory without a Git repository', async () => {
    await using fixture = await Fixture.create({ 'pullup.yml': defaultYamlConfig, nested: { child: {} } });

    expect(await resolveConfig(path.join(fixture.root, 'nested/child'))).toMatchObject([{ name: 'codeowners' }]);
  });

  it('skips empty YAML in a child before finding an ancestor', async () => {
    await using fixture = await Fixture.create({
      'pullup.yml': defaultYamlConfig,
      nested: { 'pullup.yaml': 'null\n', 'pullup.yml': '# empty\n' },
    });

    expect(await resolveConfig(path.join(fixture.root, 'nested'))).toMatchObject([{ name: 'codeowners' }]);
  });

  it('does not fall back to an ancestor when the nearest YAML is invalid', async () => {
    await using fixture = await Fixture.create({
      'pullup.yml': defaultYamlConfig,
      nested: { 'pullup.yml': 'jobs: []\n' },
    });

    await expect(resolveConfig(path.join(fixture.root, 'nested'))).rejects.toThrow('jobs must be an object.');
  });

  it('prefers pullup.yaml over pullup.yml', async () => {
    await using fixture = await Fixture.create({
      'pullup.yaml': `${defaultYamlConfig}    output: yaml/CODEOWNERS\n`,
      'pullup.yml': `${defaultYamlConfig}    output: yml/CODEOWNERS\n`,
    });

    expect(await resolveConfig(fixture.root)).toMatchObject([{ name: 'codeowners', output: 'yaml/CODEOWNERS' }]);
  });

  it.each(['', '# empty configuration\n', 'null\n', '~\n', '---\n'])(
    'skips empty or null YAML before trying pullup.yml (%j)',
    async (contents) => {
      await using fixture = await Fixture.create({
        'pullup.yaml': contents,
        'pullup.yml': defaultYamlConfig,
      });

      expect(await resolveConfig(fixture.root)).toMatchObject([{ name: 'codeowners' }]);
    },
  );

  it('reports the source path for malformed YAML', async () => {
    await using fixture = await Fixture.create({ 'pullup.yml': 'jobs: [\n' });

    await expect(resolveConfig(fixture.root)).rejects.toMatchObject({
      name: 'YAMLException',
      message: expect.stringContaining(path.join(fixture.root, 'pullup.yml')),
    });
  });

  it('validates the YAML schema', async () => {
    await using fixture = await Fixture.create({ 'pullup.yml': 'jobs: []\n' });

    await expect(resolveConfig(fixture.root)).rejects.toThrow('jobs must be an object.');
  });
});
