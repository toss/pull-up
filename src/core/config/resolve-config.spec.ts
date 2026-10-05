import path from 'node:path';

import { Fixture } from '@fixture-kit/core';

import { resolveConfig } from './resolve-config';

const customJobs = [{ name: 'custom-job', input: ['packages/*/config.json'], output: 'merged-config.json' }];
const jsonConfig = JSON.stringify(customJobs);
const esmConfig = `export default ${jsonConfig};`;
const tsConfig = `export default ${jsonConfig} as const;`;
const cjsConfig = `module.exports = ${jsonConfig};`;
const rcConfig = `- name: custom-job
  input:
    - 'packages/*/config.json'
  output: merged-config.json
`;
const defaultYamlConfig = `jobs:
  owners:
    type: codeowners
`;

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(console.warn).not.toHaveBeenCalled();
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

  it('returns no jobs for an empty jobs mapping in pullup.yml', async () => {
    await using fixture = await Fixture.create({ 'pullup.yml': 'jobs: {}\n' });

    expect(await resolveConfig(fixture.root)).toEqual([]);
  });

  it.each([
    ['pullup.config.js', esmConfig],
    ['pullup.config.ts', tsConfig],
    ['pullup.config.cjs', cjsConfig],
    ['pullup.config.mjs', esmConfig],
    ['.pulluprc.js', esmConfig],
    ['.pulluprc.ts', tsConfig],
    ['.pulluprc.cjs', cjsConfig],
    ['.pulluprc.mjs', esmConfig],
  ])('resolves jobs from %s and warns about deprecation once', async (filename, contents) => {
    await using fixture = await Fixture.create({
      'package.json': JSON.stringify({ type: 'module' }),
      [filename]: contents,
    });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(fixture.root, filename)));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[DEPRECATED]'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('pullup.yml or pullup.yaml'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('external commands'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('https://github.com/toss/pull-up#migration'));
  });

  it.each([
    ['.pulluprc', rcConfig],
    ['.pulluprc.json', jsonConfig],
    ['.pulluprc.yaml', rcConfig],
    ['.pulluprc.yml', rcConfig],
  ])('resolves jobs from %s without a deprecation warning', async (filename, contents) => {
    await using fixture = await Fixture.create({
      'package.json': JSON.stringify({ type: 'module' }),
      [filename]: contents,
    });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns about an empty JavaScript configuration', async () => {
    await using fixture = await Fixture.create({ 'pullup.config.cjs': 'module.exports = [];' });

    expect(await resolveConfig(fixture.root)).toEqual([]);
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(fixture.root, 'pullup.config.cjs')));
  });

  it('warns about a script configuration discovered inside .config', async () => {
    await using fixture = await Fixture.create({ '.config': { 'pulluprc.cjs': cjsConfig } });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(path.join(fixture.root, '.config', 'pulluprc.cjs')),
    );
  });

  it('resolves jobs from package.json#pullup', async () => {
    await using fixture = await Fixture.create({ 'package.json': JSON.stringify({ pullup: customJobs }) });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('resolves jobs from .config/pulluprc', async () => {
    await using fixture = await Fixture.create({ '.config': { pulluprc: rcConfig } });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('returns no jobs when no config exists', async () => {
    await using fixture = await Fixture.create({});

    expect(await resolveConfig(fixture.root)).toEqual([]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('prefers pullup.yaml over pullup.yml', async () => {
    await using fixture = await Fixture.create({
      'pullup.yaml': `${defaultYamlConfig}    output: yaml/CODEOWNERS\n`,
      'pullup.yml': `${defaultYamlConfig}    output: yml/CODEOWNERS\n`,
    });

    expect(await resolveConfig(fixture.root)).toMatchObject([{ name: 'codeowners', output: 'yaml/CODEOWNERS' }]);
  });

  it('prefers pullup.config.js over pullup.yml', async () => {
    await using fixture = await Fixture.create({
      'package.json': JSON.stringify({ type: 'module' }),
      'pullup.config.js': esmConfig,
      'pullup.yml': 'jobs: []\n',
    });
    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(fixture.root, 'pullup.config.js')));
  });

  it('prefers package.json over pullup.config.js', async () => {
    await using fixture = await Fixture.create({
      'package.json': JSON.stringify({ type: 'module', pullup: customJobs }),
      'pullup.config.js': 'export default [{ name: "other-job", input: [], output: "other.json" }];',
    });

    expect(await resolveConfig(fixture.root)).toEqual(customJobs);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('uses cosmiconfig.searchPlaces from package.json', async () => {
    await using fixture = await Fixture.create({
      'package.json': JSON.stringify({ cosmiconfig: { searchPlaces: ['pullup.yml'], mergeSearchPlaces: false } }),
      'pullup.yml': `${defaultYamlConfig}    output: custom/CODEOWNERS\n`,
    });
    vi.spyOn(process, 'cwd').mockReturnValue(fixture.root);

    expect(await resolveConfig(fixture.root)).toMatchObject([{ name: 'codeowners', output: 'custom/CODEOWNERS' }]);
  });
});
