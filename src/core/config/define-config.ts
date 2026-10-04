import type { Job } from '../types';

/**
 * @deprecated use `pullup.yaml` or `pullup.yml` instead.
 */
export function defineConfig(config: Job | Job[]) {
  if (Array.isArray(config)) {
    return config;
  }

  return [config];
}
