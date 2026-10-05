import path from 'node:path';

import { cosmiconfig, getDefaultSearchPlaces } from 'cosmiconfig';
import * as v from 'valibot';

import { codeownersJob } from '../jobs';
import type { Job } from '../types';
import { type Config, ConfigSchema } from './schema';

export async function resolveConfig(cwd: string): Promise<Job[]> {
  const explorer = cosmiconfig('pullup', {
    searchPlaces: [...getDefaultSearchPlaces('pullup'), 'pullup.yaml', 'pullup.yml'],
  });
  const result = await explorer.search(cwd);

  if (result == null) {
    return [];
  }

  if (['pullup.yaml', 'pullup.yml'].includes(path.basename(result.filepath))) {
    return toJobs(v.parse(ConfigSchema, result.config));
  }

  return result.config as Job[];
}

function toJobs(config: Config): Job[] {
  return Object.values(config.jobs).map((job) => {
    switch (job.type) {
      case 'codeowners':
        return codeownersJob({ input: job.input, output: job.output });
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  });
}
