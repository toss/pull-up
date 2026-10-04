import { styleText } from 'node:util';

import { Command, Option } from 'clipanion';
import * as v from 'valibot';

import { resolveConfig } from '../../core';
import { runJob } from '../../core/run-job';
import { resolveRepositoryRoot } from '../utils';

export class CheckCommand extends Command {
  static paths = [['check']];
  static usage = Command.Usage({
    description: 'Check if generated files are up to date',
    examples: [['Check all jobs', 'pullup check']],
  });

  root = Option.String('--root', {
    description: 'The path to the repository root',
    required: false,
  });

  cwd = Option.String('--cwd', {
    description: 'The path to the working directory',
    required: false,
  });

  async execute() {
    try {
      const cwd = this.cwd ?? process.cwd();
      const [repoRoot, jobs] = await Promise.all([resolveRepositoryRoot(cwd, this.root), resolveConfig(cwd)]);

      if (jobs.length === 0) {
        console.log(styleText('yellow', '✘ No jobs found to check'));
        return;
      }

      const results = await Promise.all(jobs.map((job) => runJob(job, repoRoot)));

      for (const { isSame, jobInfo } of results) {
        if (!isSame) {
          console.error(styleText('red', `✘ ${jobInfo.name} is outdated. Run 'pullup sync' to update.`));
          process.exit(1);
        }
      }

      console.log(styleText('green', '✔ All files are up to date'));
      return 0;
    } catch (error) {
      if (v.isValiError(error)) {
        console.error(styleText('red', v.summarize(error.issues)));
        return 1;
      }
      console.error(styleText('red', `✘ Error occurred while checking: ${error}`));
      return 1;
    }
  }
}
