import type { Rule, FileSnapshot } from "./types";
import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "path";

export async function resolveRule(
  rule: Rule,
  rootPath: string,
): Promise<FileSnapshot> {
  const sourcePaths = await fg([...rule.from, `!${rule.output}`], {
    cwd: rootPath,
  });

  const sources = await Promise.all(
    sourcePaths.map((filePath) => readFile(rootPath, filePath)),
  );

  const outputPath = path.resolve(rootPath, rule.output);
  const existing = await readFileOrNull(outputPath);

  const contents = await rule.transform(sources, {
    root: rootPath,
    outputPath,
    existingContents: existing ?? null,
  });

  return {
    path: outputPath,
    contents,
  };
}

async function readFile(
  rootPath: string,
  filePath: string,
): Promise<FileSnapshot> {
  const absPath = path.resolve(rootPath, filePath);
  const contents = await fs.readFile(absPath, "utf-8");
  return { path: absPath, contents };
}

async function readFileOrNull(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, "utf-8");
  } catch {
    return null;
  }
}
