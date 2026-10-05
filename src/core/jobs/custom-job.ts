import { execa } from 'execa';

import type { Job } from '../types';

interface CustomJobOptions {
  command: string;
  input?: string[];
  output: string;
}

export function customJob(options: CustomJobOptions): Job {
  return {
    name: 'custom',
    input: options.input ?? [],
    output: options.output,
    transform: async (inputFiles, context) => {
      const { stdout } = await execa('sh', ['-c', options.command], {
        cwd: context.rootDir,
        input: JSON.stringify({ sources: inputFiles, context }),
        stripFinalNewline: false,
        maxBuffer: Infinity,
        killDescendants: true,
      });

      return stdout;
    },
  };
}
