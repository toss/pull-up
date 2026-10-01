import { cosmiconfig } from 'cosmiconfig';

import type { Job } from './types';

export async function resolveConfig(cwd: string): Promise<Job[]> {
  const explorer = cosmiconfig('pullup');
  const result = await explorer.search(cwd);

  if (result == null) {
    return [];
  }

  return result.config as Job[];
}
