import * as v from 'valibot';

const JobKeySchema = v.pipe(v.string(), v.notValues(['constructor', 'prototype', '__proto__']));

const CodeownersJobSchema = v.strictObject({
  type: v.literal('codeowners'),
  input: v.pipe(
    v.optional(v.array(v.string())),
    v.metadata({ description: 'Input file paths for the job', examples: [['**/CODEOWNERS', '!**/fixtures/**']] }),
  ),
  output: v.pipe(
    v.optional(v.string()),
    v.metadata({
      description: 'Output file path for the job',
      examples: ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'],
    }),
  ),
});

const CustomJobSchema = v.strictObject({
  type: v.literal('custom'),
  command: v.pipe(
    v.string(),
    v.minLength(1),
    v.metadata({
      description: 'The command to run for the custom job',
      examples: ['node scripts/generate-codeowners.js', 'python scripts/generate-codeowners.py'],
    }),
  ),
  input: v.pipe(
    v.optional(v.array(v.string())),
    v.metadata({ description: 'Input file paths for the job', examples: [['**/CODEOWNERS', '!**/fixtures/**']] }),
  ),
  output: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.metadata({
      description: 'Output file path for the job',
      examples: ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'],
    }),
  ),
});

export const ConfigSchema = v.strictObject({
  jobs: v.pipe(
    v.custom<Record<string, unknown>>(
      (input) => input !== null && typeof input === 'object' && !Array.isArray(input),
      'jobs must be an object.',
    ),
    v.check(
      (jobs) => Object.keys(jobs).every((key) => v.is(JobKeySchema, key)),
      'jobs must not use constructor, prototype, or __proto__ as keys.',
    ),
    v.record(JobKeySchema, v.union([CodeownersJobSchema, CustomJobSchema])),
  ),
});

export type Config = v.InferOutput<typeof ConfigSchema>;
