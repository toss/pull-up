import path from 'node:path';
import { styleText } from 'node:util';

import { cosmiconfig, type CosmiconfigResult, defaultLoaders } from 'cosmiconfig';
import * as v from 'valibot';

import { codeownersJob } from '../jobs';
import type { Job } from '../types';
import { type Config, ConfigSchema } from './schema';

export async function searchLegacyConfig(cwd: string): Promise<CosmiconfigResult | null> {
  const explorer = cosmiconfig('pullup', {
    searchPlaces: [
      'pullup.config.ts',
      'pullup.config.js',
      'pullup.config.cjs',
      'pullup.config.mjs',
      '.pulluprc.js',
      '.pulluprc.cjs',
    ],
    loaders: loadersForExtensions(['.ts', '.js', '.cjs', '.mjs']),
  });
  const result = await explorer.search(cwd);

  return result;
}

export async function searchConfig(cwd: string): Promise<CosmiconfigResult | null> {
  const explorer = cosmiconfig('pullup', {
    searchPlaces: ['pullup.yaml', 'pullup.yml'],
    loaders: loadersForExtensions(['.yaml', '.yml']),
  });
  const result = await explorer.search(cwd);

  if (result == null) {
    return null;
  }

  return { filepath: result.filepath, config: v.parse(ConfigSchema, result.config) };
}

export async function resolveConfig(cwd: string): Promise<Job[]> {
  const [legacyConfig, config] = await Promise.all([searchLegacyConfig(cwd), searchConfig(cwd)]);

  if (legacyConfig != null && config != null) {
    throw new Error('Both legacy config and new config are found. Please use only one of them.');
  }

  if (legacyConfig != null) {
    console.warn(
      styleText(
        'yellow',
        `Legacy config is found at ${path.relative(cwd, legacyConfig.filepath)}. Please consider migrating to the new config format.`,
      ),
    );
    return legacyConfig.config as Job[];
  }

  if (config == null) {
    throw new Error('No config found. Please create a config file.');
  }

  return toJobs(config.config);
}

function toJobs(config: Config): Job[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Object.entries(config.jobs).map(([_name, job]) => {
    switch (job.type) {
      case 'codeowners':
        return codeownersJob({ input: job.input, output: job.output });
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  });
}

function loadersForExtensions(extensions: string[]) {
  return Object.fromEntries(
    Object.entries(defaultLoaders).map(([extension, loader]) => [
      extension,
      extensions.includes(extension) ? loader : () => null,
    ]),
  );
}
