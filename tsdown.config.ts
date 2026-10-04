import { writeFile } from 'node:fs/promises';

import { toJsonSchema } from '@valibot/to-json-schema';
import { defineConfig } from 'tsdown';

import { ConfigSchema } from './src/core/config/schema.ts';

async function generateSchema() {
  const schema = toJsonSchema(ConfigSchema, {
    target: 'draft-07',
    typeMode: 'output',
  });

  await writeFile('./schema.json', `${JSON.stringify(schema, null, 2)}\n`);
}

export default defineConfig([
  {
    entry: 'src/cli/index.ts',
    banner: '#!/usr/bin/env node',
    dts: false,
    minify: true,
    noExternal: ['clipanion', 'picocolors'],
    outDir: 'dist/bin',
  },
  {
    entry: 'src/core/index.ts',
    dts: true,
    outDir: 'dist/core',
    hooks: {
      'build:done': generateSchema,
    },
  },
]);
