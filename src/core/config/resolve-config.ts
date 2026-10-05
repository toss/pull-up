import path from 'node:path';
import { styleText } from 'node:util';

import { cosmiconfig, getDefaultSearchPlaces } from 'cosmiconfig';
import * as v from 'valibot';

import { codeownersJob } from '../jobs';
import { customJob } from '../jobs/custom-job';
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

  if (['.js', '.ts', '.cjs', '.mjs'].includes(path.extname(result.filepath))) {
    console.warn(
      styleText(
        'yellow',
        [
          `[DEPRECATED] JavaScript/TypeScript configuration is deprecated: ${result.filepath}`,
          'Use pullup.yml or pullup.yaml for built-in jobs and external commands for custom transforms.',
          'Migration guide: https://github.com/toss/pull-up#migration',
          '',
        ].join('\n'),
      ),
    );
  }

  return result.config as Job[];
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
