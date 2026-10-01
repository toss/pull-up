import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'clipanion';

import { resolveConfig } from '../../core/resolve-config';
import { runJob } from '../../core/run-job';
import { resolveRepositoryRoot } from '../utils';

export class SyncCommand extends Command {
  static paths = [['sync']];
  static usage = Command.Usage({
    description: 'sync files',
    examples: [['Sync files', 'pullup sync']],
  });

  root = Option.String('--root', {
    description: 'The path to the repository root',
    required: false,
  });

  cwd = Option.String('--cwd', {
    description: 'The path to the working directory',
    required: false,
  });

  dryRun = Option.Boolean('--dry-run', {
    description: 'Whether to dry run the check',
    required: false,
  });

  async execute() {
    const cwd = this.cwd ?? process.cwd();
    const repoRoot = await resolveRepositoryRoot(cwd, this.root);
    const jobs = await resolveConfig(cwd);

    if (jobs.length === 0) {
      console.log(styleText('yellow', '✘ No jobs found to sync'));
      return;
    }

    const results = await Promise.all(jobs.map((job) => runJob(job, repoRoot)));

    for (const { jobInfo, generated, isSame } of results) {
      if (this.dryRun === true) {
        console.log(styleText('cyan', `┌─ [Job] ${jobInfo.name}`));
        console.log(`${styleText('cyan', '│')}  ${styleText('dim', `Output: ${jobInfo.output}`)}`);
        console.log(`${styleText('cyan', '│')}`);
        generated.contents.split('\n').forEach((line) => {
          console.log(`${styleText('cyan', '│')}  ${line}`);
        });
        console.log(`${styleText('cyan', '└─')}`);
        continue;
      }

      if (!isSame) {
        const outputPath = path.resolve(repoRoot, jobInfo.output);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, generated.contents);
      }

      console.log(styleText('green', `✔ ${jobInfo.name} synced`));
    }
  }
}
