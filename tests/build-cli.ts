import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export default async function buildCli() {
  await promisify(execFile)('yarn', ['build'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
  });
}
