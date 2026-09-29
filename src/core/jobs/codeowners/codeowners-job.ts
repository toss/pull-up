import path from "node:path";

import { defineJob } from "../../define-job";
import type { Source } from "../../types";
import { Codeowners } from "./codeowners";

interface CodeownersJobOptions {
  output?: string;
  input?: string[];
}

const DEFAULT_FROM_PATTERN = ["**/CODEOWNERS"];
const DEFAULT_OUTPUT_PATH = ".github/CODEOWNERS";

export const codeownersJob = defineJob((options?: CodeownersJobOptions) => ({
  name: "codeowners",
  input: options?.input ?? DEFAULT_FROM_PATTERN,
  output: options?.output ?? DEFAULT_OUTPUT_PATH,
  transform: (inputFiles, { rootDir }) => {
    const sortedInputFiles = sortByDirectory(inputFiles, rootDir);

    const codeowners = Codeowners.merge(
      sortedInputFiles.map(({ file, baseDir }) =>
        Codeowners.from(file.contents).map(({ pattern, owners }) => ({
          pattern: toAbsolutePattern(pattern, baseDir),
          owners,
        })),
      ),
    );

    if (codeowners.isEmpty()) {
      return "";
    }

    return codeowners.stringify();
  },
}));

// Compare directory segments to keep parents before their descendants.
const sortByDirectory = (inputFiles: Source[], rootDir: string) =>
  inputFiles
    .map((file) => {
      // Use the same normalized path for ordering and generated patterns.
      const relativePath = path.relative(
        rootDir,
        path.resolve(rootDir, file.path),
      );
      const directoryPath = path.dirname(relativePath);
      const baseDir = directoryPath === "." ? "" : directoryPath;
      return {
        file,
        relativePath,
        baseDir,
        segments: baseDir === "" ? [] : baseDir.split(path.sep),
      };
    })
    .sort((a, b) => {
      const length = Math.min(a.segments.length, b.segments.length);
      for (let index = 0; index < length; index++) {
        const left = a.segments[index]!;
        const right = b.segments[index]!;
        if (left !== right) {
          return left.localeCompare(right) || (left < right ? -1 : 1);
        }
      }

      return (
        a.segments.length - b.segments.length ||
        a.relativePath.localeCompare(b.relativePath)
      );
    });

const toAbsolutePattern = (pattern: string, baseDir: string) => {
  const base = baseDir !== "" ? `/${baseDir}` : "";
  return pattern === "*" ? `${base}/` : `${base}/${stripLeadingSlash(pattern)}`;
};

const stripLeadingSlash = (text: string) => text.replace(/^\//, "");
