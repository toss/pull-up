import { execa } from 'execa';

import { defineJob } from '../define-job';

interface CustomJobOptions {
  command: string;
  input?: string[];
  output: string;
}

export const customJob = defineJob((options: CustomJobOptions) => ({
  name: 'custom',
  input: options.input ?? [],
  output: options.output,
  transform: async (inputFiles, context) => {
    const subprocess = execa('sh', ['-c', options.command], {
      cwd: context.rootDir,
      input: JSON.stringify({ sources: inputFiles, context }),
      stripFinalNewline: false,
      maxBuffer: Infinity,
    });
    subprocess.stdin?.once('error', (error: Error) => {
      subprocess.kill('SIGKILL', error);
    });

    const { stdout } = await subprocess;
    return stdout;
  },
}));
