import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { findUp } from 'find-up';
import { load } from 'js-yaml';
import * as v from 'valibot';

import { codeownersJob } from '../jobs/codeowners/codeowners-job';
import { customJob } from '../jobs/custom-job';
import type { Job } from '../types';
import { type Config, ConfigSchema } from './schema';

export async function resolveConfig(cwd: string): Promise<Job[]> {
  let config: unknown;
  const filepath = await findUp(
    async (directory) => {
      for (const filename of ['pullup.yaml', 'pullup.yml']) {
        const configPath = path.join(directory, filename);
        try {
          config = load(await readFile(configPath, 'utf8'), { filename: configPath });
        } catch (error) {
          if (['ENOENT', 'EISDIR', 'ENOTDIR', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) continue;
          throw error;
        }
        if (config !== undefined && config !== null) return filename;
      }
      return undefined;
    },
    { cwd },
  );

  return filepath === undefined ? [] : toJobs(v.parse(ConfigSchema, config));
}

function toJobs(config: Config): Job[] {
  return Object.values(config.jobs).map((job) => {
    switch (job.type) {
      case 'codeowners':
        return codeownersJob({ input: job.input, output: job.output });
      case 'custom':
        return customJob({ input: job.input, output: job.output, command: job.command });
    }
  });
}
