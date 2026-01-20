import { Command, Option } from "clipanion";
import pc from "picocolors";
import { resolveRule, type Rule } from "../../core";
import fs from "node:fs/promises";
import { defaultRules } from "../constants";
import { getRepositoryRoot } from "../utils";
import path from "node:path";

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

  rules = Option.Array("--rule", {
    description: "The rules to sync",
    required: false,
  });

  async execute() {
    const repoRoot = await this.resolveRoot();
    const resolvedRules = this.resolveRules();

    if (resolvedRules.length === 0) {
      console.log(pc.yellow("✘ No rules found to sync"));
      return;
    }

    for (const [name, rule] of resolvedRules) {
      if (this.rules != null && !this.rules.includes(name)) {
        continue;
      }

      try {
        const resolved = await resolveRule(rule, repoRoot);

        if (this.dryRun) {
          console.log(pc.cyan(`┌─ [Rule] ${name}`));
          console.log(`${pc.cyan("│")}  ${pc.dim(`Output: ${rule.output}`)}`);
          console.log(`${pc.cyan("│")}`);
          resolved.contents.split("\n").forEach((line) => {
            console.log(`${pc.cyan("│")}  ${line}`);
          });
          console.log(`${pc.cyan("└─")}`);
          continue;
        }

        const outputPath = path.resolve(repoRoot, rule.output);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, resolved.contents);

        console.log(pc.green(`✔ ${name} synced`));
      } catch (error) {
        console.error(pc.red(`✘ ${name}: ${error}`));
        process.exit(1);
      }
    }
  }

  private async resolveRoot(): Promise<string> {
    if (this.root != null) return this.root;

    const cwd = this.cwd ?? process.cwd();
    const root = await getRepositoryRoot(cwd);

    if (root == null) throw new Error("Repository root not found");
    return root;
  }

  private resolveRules(): [string, Rule][] {
    const ruleKeys =
      this.rules != null ? this.rules : Object.keys(defaultRules);
    return Object.entries(defaultRules).filter(([name]) =>
      ruleKeys.includes(name),
    );
  }
}
