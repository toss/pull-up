import type { Job } from '../types';

export type LegacyConfig = Job[];

export type LoadedConfig<T> = {
  filepath: string;
  config: T;
};
