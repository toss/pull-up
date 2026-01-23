import type { Job } from "./types";

export function defineConfig(config: Job | Job[]) {
  if (Array.isArray(config)) {
    return config;
  }

  return [config];
}
