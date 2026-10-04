import * as v from 'valibot';

export const CodeownersJobSchema = v.strictObject({
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

export const ConfigSchema = v.strictObject({
  jobs: v.pipe(
    v.unknown(),
    v.check((input) => !Array.isArray(input), 'jobs must be an object.'),
    v.record(v.string(), CodeownersJobSchema),
  ),
});

export type CodeownersJob = v.InferOutput<typeof CodeownersJobSchema>;
export type Config = v.InferOutput<typeof ConfigSchema>;
