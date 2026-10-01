import type { Job } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineJob<Args extends any[]>(jobFactory: Job | ((...args: Args) => Job)) {
  if (typeof jobFactory === 'function') {
    return jobFactory;
  }

  return () => jobFactory;
}
