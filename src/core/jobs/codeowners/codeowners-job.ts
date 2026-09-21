import { defineJob } from "../../define-job";
import { Codeowners } from "./codeowners";
import path from "node:path";

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
    // GitHub uses the last matching rule, so nested owners must follow defaults.
    const sortedInputFiles = inputFiles
      .map((file) => ({
        ...file,
        depth: path.resolve(rootDir, file.path).split(path.sep).length,
      }))
      .sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));

    const codeowners = Codeowners.merge(
      sortedInputFiles.map((inputFile) => {
        const baseDir = path.relative(rootDir, path.dirname(inputFile.path));

        return Codeowners.from(inputFile.contents).map(
          ({ pattern, owners }) => ({
            pattern: toAbsolutePattern(pattern, baseDir),
            owners,
          }),
        );
      }),
    );

    if (codeowners.isEmpty()) {
      return "";
    }

    return codeowners.stringify();
  },
}));

const toAbsolutePattern = (pattern: string, baseDir: string) => {
  const base = baseDir !== "" ? `/${baseDir}` : "";
  return pattern === "*" ? `${base}/` : `${base}/${stripLeadingSlash(pattern)}`;
};

const stripLeadingSlash = (text: string) => text.replace(/^\//, "");
