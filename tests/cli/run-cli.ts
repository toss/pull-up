import { execa } from 'execa';
import { inject } from 'vitest';

export interface CliRunner {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

declare module 'vitest' {
  export interface ProvidedContext {
    cli: CliRunner;
  }
}

export async function runCli(command: string, rootDir: string, args: string[] = []) {
  const cli = inject('cli');
  const result = await execa(cli.command, [...cli.args, command, ...args], {
    cwd: rootDir,
    env: cli.env,
    extendEnv: false,
    reject: false,
    stripFinalNewline: false,
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.exitCode === undefined) {
    throw result;
  }
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}
