import type { Job, Source } from "./types";
import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "path";
import { readFileOrNull } from "./utils";

interface RunJobResult {
  jobInfo: Job;
  generated: Source;
  isSame: boolean;
}

export async function runJob(job: Job, rootDir: string): Promise<RunJobResult> {
  const inputFilePaths = await fg([...job.input, `!${job.output}`], {
    cwd: rootDir,
  }).then((paths) => paths.toSorted((a, b) => a.localeCompare(b)));

  const inputFiles = await Promise.all(
    inputFilePaths.map((filePath) => readSource(rootDir, filePath)),
  );

  const outputPath = path.resolve(rootDir, job.output);
  const existing = await readFileOrNull(outputPath);

  const contents = await job.transform(inputFiles, {
    rootDir,
    outputPath,
  });

  return {
    isSame: existing === contents,
    jobInfo: job,
    generated: {
      path: outputPath,
      contents,
    },
  };
}

async function readSource(rootPath: string, filePath: string): Promise<Source> {
  const absPath = path.resolve(rootPath, filePath);
  const contents = await fs.readFile(absPath, "utf-8");
  return { path: filePath, contents };
}
