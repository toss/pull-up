import * as v from 'valibot';

import { ConfigSchema } from './schema';

describe('ConfigSchema', () => {
  it.each([
    { name: 'a job with default options', config: { jobs: { owners: { type: 'codeowners' } } } },
    {
      name: 'named jobs with explicit options',
      config: {
        jobs: {
          packages: {
            type: 'codeowners',
            input: ['packages/**/CODEOWNERS', '!packages/fixtures/**'],
            output: '.github/CODEOWNERS',
          },
          docs: { type: 'codeowners', input: ['docs/**/CODEOWNERS'], output: 'docs/CODEOWNERS' },
        },
      },
    },
    { name: 'an empty jobs mapping', config: { jobs: {} } },
  ])('accepts $name', ({ config }) => {
    expect(v.parse(ConfigSchema, config)).toEqual(config);
  });

  it.each([
    { name: 'missing jobs', config: {} },
    { name: 'an empty jobs array', config: { jobs: [] } },
    { name: 'a non-empty jobs array', config: { jobs: [{ type: 'codeowners' }] } },
    { name: 'a missing job type', config: { jobs: { owners: {} } } },
    { name: 'an unsupported job type', config: { jobs: { owners: { type: 'custom' } } } },
    { name: 'a scalar input', config: { jobs: { owners: { type: 'codeowners', input: '**/CODEOWNERS' } } } },
    { name: 'a non-string input pattern', config: { jobs: { owners: { type: 'codeowners', input: [123] } } } },
    { name: 'an output array', config: { jobs: { owners: { type: 'codeowners', output: ['CODEOWNERS'] } } } },
    { name: 'a null output', config: { jobs: { owners: { type: 'codeowners', output: null } } } },
    { name: 'an unknown root property', config: { jobs: {}, extra: true } },
    {
      name: 'an unknown job property',
      config: { jobs: { owners: { type: 'codeowners', from: ['**/CODEOWNERS'] } } },
    },
  ])('rejects $name', ({ config }) => {
    expect(v.safeParse(ConfigSchema, config).success).toBe(false);
  });
});
