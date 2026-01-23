import { Command, Option } from "clipanion";
import pc from "picocolors";
import fs from "node:fs/promises";
import { resolveRepositoryRoot } from "../utils";
import path from "node:path";
import { resolveConfig } from "../../core/resolve-config";
import { runJob } from "../../core/run-job";

export class SyncCommand extends Command {
  static paths = [["sync"]];
  static usage = Command.Usage({
    description: "sync files",
    examples: [["Sync files", "pullup sync"]],
  });

  root = Option.String("--root", {
    description: "The path to the repository root",
    required: false,
  });

  cwd = Option.String("--cwd", {
    description: "The path to the working directory",
    required: false,
  });

  dryRun = Option.Boolean("--dry-run", {
    description: "Whether to dry run the check",
    required: false,
  });

  async execute() {
    const cwd = this.cwd ?? process.cwd();
    const repoRoot = await resolveRepositoryRoot(cwd, this.root);
    const jobs = await resolveConfig(cwd);

    if (jobs.length === 0) {
      console.log(pc.yellow("✘ No jobs found to sync"));
      return;
    }

    const results = await Promise.all(jobs.map((job) => runJob(job, repoRoot)));

    for (const { jobInfo, generated, isSame } of results) {
      if (this.dryRun) {
        console.log(pc.cyan(`┌─ [Job] ${jobInfo.name}`));
        console.log(`${pc.cyan("│")}  ${pc.dim(`Output: ${jobInfo.output}`)}`);
        console.log(`${pc.cyan("│")}`);
        generated.contents.split("\n").forEach((line) => {
          console.log(`${pc.cyan("│")}  ${line}`);
        });
        console.log(`${pc.cyan("└─")}`);
        continue;
      }

      if (!isSame) {
        const outputPath = path.resolve(repoRoot, jobInfo.output);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, generated.contents);
      }

      console.log(pc.green(`✔ ${jobInfo.name} synced`));
    }
  }
}
