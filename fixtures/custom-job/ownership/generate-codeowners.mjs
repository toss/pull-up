import { readFileSync } from 'node:fs';
import path from 'node:path';

import { load } from 'js-yaml';

const { sources } = JSON.parse(readFileSync(0, 'utf8'));
const configs = sources.map(({ path: sourcePath, contents }) => ({
  path: sourcePath,
  config: load(contents, { filename: sourcePath }),
}));
const registry = configs.find(({ path: sourcePath }) => sourcePath === 'codeowners.yaml').config;
const declarations = configs
  .filter(({ path: sourcePath }) => sourcePath !== 'codeowners.yaml')
  .flatMap(({ path: sourcePath, config }) => {
    const directory = path.posix.dirname(sourcePath);
    return [
      { directory, owners: config.owners },
      ...(config.rules ?? []).map((rule) => ({
        directory: path.posix.join(directory, rule.path).replace(/\/$/, ''),
        owners: rule.owners,
      })),
    ];
  });

declarations.sort((left, right) => {
  const depth = left.directory.split('/').length - right.directory.split('/').length;
  return depth || left.directory.localeCompare(right.directory);
});

const lines = declarations.map(({ directory, owners }) => {
  const members = new Set([
    ...(owners.teams ?? []).flatMap((team) => registry.teams[team].members),
    ...(owners.people ?? []),
  ]);
  const handles = Object.entries(registry.people)
    .filter(([person]) => members.has(person))
    .map(([, person]) => `@${person.github}`)
    .join(' ');
  return `/${directory}/ ${handles}\n`;
});

process.stdout.write(lines.join(''));
