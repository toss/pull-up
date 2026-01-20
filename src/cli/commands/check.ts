import { Command, Option } from "clipanion";
import pc from "picocolors";
import { resolveRule, Rule } from "../../core";
import fs from "node:fs/promises";
import { defaultRules } from "../constants";
import { getRepositoryRoot } from "../utils";
import path from "node:path";

export class CheckCommand extends Command {
  static paths = [["check"]];
  static usage = Command.Usage({
    description: "Check if generated files are up to date",
    examples: [["Check all rules", "pullup check"]],
  });

  root = Option.String("--root", {
    description: "The path to the repository root",
    required: false,
  });

  cwd = Option.String("--cwd", {
    description: "The path to the working directory",
    required: false,
  });

  rules = Option.Array("--rule", {
    description: "The rules to check",
    required: false,
  });

  async execute() {
    const repoRoot = await this.resolveRoot();
    const resolvedRules = this.resolveRules();

    if (resolvedRules.length === 0) {
      console.log(pc.yellow("✘ No rules found to check"));
      return;
    }

    const results = await Promise.all(
      resolvedRules.map(([name, rule]) => this.checkRule(name, rule, repoRoot)),
    );

    const failures = results.filter((r) => !r.ok);

    if (failures.length > 0) {
      failures.forEach((f) =>
        console.error(
          pc.red(`✘ ${f.name} is outdated. Run 'pullup sync' to update.`),
        ),
      );
      process.exit(1);
    }

    console.log(pc.green("✔ All files are up to date"));
  }

  private async resolveRoot(): Promise<string> {
    if (this.root != null) return this.root;

    const cwd = this.cwd ?? process.cwd();
    const root = await getRepositoryRoot(cwd);

    if (root == null) throw new Error("Repository root not found");
    return root;
  }

  private async checkRule(
    name: string,
    rule: Rule,
    repoRoot: string,
  ): Promise<{ name: string; ok: boolean }> {
    const outputPath = path.resolve(repoRoot, rule.output);
    const existing = await readFileOrNull(outputPath);
    const resolved = await resolveRule(rule, repoRoot);

    return { name, ok: existing === resolved.contents };
  }

  private resolveRules(): [string, Rule][] {
    const ruleKeys =
      this.rules != null ? this.rules : Object.keys(defaultRules);
    return Object.entries(defaultRules).filter(([name]) =>
      ruleKeys.includes(name),
    );
  }
}

async function readFileOrNull(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, "utf-8");
  } catch {
    return null;
  }
}
