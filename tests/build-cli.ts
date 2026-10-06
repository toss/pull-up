import { symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Fixture } from '@fixture-kit/core';
import { execa } from 'execa';
import type { TestProject } from 'vitest/node';

export default async function buildCli(project: TestProject) {
  const executable = project.name === 'exe';
  const rootDir = fileURLToPath(new URL('../', import.meta.url));
  if (executable && !['darwin', 'linux'].includes(process.platform)) {
    throw new Error('Executable tests require macOS or Linux.');
  }

  await execa('yarn', ['build'], {
    cwd: rootDir,
  });

  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' };
  delete env.FORCE_COLOR;

  if (!executable) {
    project.provide('cli', {
      command: process.execPath,
      args: [path.join(rootDir, 'dist/bin/index.mjs')],
      env,
    });
    return;
  }

  const fixture = await Fixture.create({});
  try {
    await symlink('/bin/sh', path.join(fixture.root, 'sh'));
    env.PATH = fixture.root;
    for (const key of Object.keys(env)) {
      if (['NODE_OPTIONS', 'NODE_PATH', 'PNPAPI'].includes(key) || /^(?:YARN_|PNP_)/.test(key)) {
        delete env[key];
      }
    }
    project.provide('cli', {
      command: path.join(rootDir, 'build', `pullup-${process.platform}-${process.arch}`),
      args: [],
      env,
    });
    return () => fixture.cleanup();
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}
