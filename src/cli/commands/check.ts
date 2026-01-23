import { Command, Option } from "clipanion";
import pc from "picocolors";
import { resolveConfig } from "../../core/resolve-config";
import { runJob } from "../../core/run-job";
import { resolveRepositoryRoot } from "../utils";

export class CheckCommand extends Command {
  static paths = [["check"]];
  static usage = Command.Usage({
    description: "Check if generated files are up to date",
    examples: [["Check all jobs", "pullup check"]],
  });

  root = Option.String("--root", {
    description: "The path to the repository root",
    required: false,
  });

  cwd = Option.String("--cwd", {
    description: "The path to the working directory",
    required: false,
  });

  async execute() {
    const cwd = this.cwd ?? process.cwd();
    const [repoRoot, jobs] = await Promise.all([
      resolveRepositoryRoot(cwd, this.root),
      resolveConfig(cwd),
    ]);

    if (jobs.length === 0) {
      console.log(pc.yellow("✘ No jobs found to check"));
      return;
    }

    const results = await Promise.all(jobs.map((job) => runJob(job, repoRoot)));

    for (const { isSame, jobInfo } of results) {
      if (!isSame) {
        console.error(
          pc.red(`✘ ${jobInfo.name} is outdated. Run 'pullup sync' to update.`),
        );
        process.exit(1);
      }
    }

    console.log(pc.green("✔ All files are up to date"));
  }
}
