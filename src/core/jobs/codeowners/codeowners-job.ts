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
      sortedInputFiles.map((inputFile) => {
        const baseDir = path.relative(
          rootDir,
          path.dirname(path.resolve(rootDir, inputFile.path)),
        );

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

interface Directory {
  name: string;
  files: Source[];
  children: Directory[];
}

// Depth-first order keeps each directory's rules together, with parents first.
const sortByDirectory = (inputFiles: Source[], rootDir: string): Source[] => {
  const root: Directory = { name: "", files: [], children: [] };
  const directories = new Map<string, Directory>();

  const getDirectory = (directoryPath: string): Directory => {
    const existing = directories.get(directoryPath);
    if (existing !== undefined) return existing;

    const directory: Directory = {
      name: path.basename(directoryPath) || directoryPath,
      files: [],
      children: [],
    };
    directories.set(directoryPath, directory);

    const parentPath = path.dirname(directoryPath);
    const parent =
      parentPath === directoryPath ? root : getDirectory(parentPath);
    parent.children.push(directory);
    return directory;
  };

  for (const file of inputFiles) {
    getDirectory(path.dirname(path.resolve(rootDir, file.path))).files.push(
      file,
    );
  }

  const sortedFiles: Source[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    if (directory.files.length > 1) {
      directory.files.sort((a, b) => a.path.localeCompare(b.path));
    }
    // Emit parents first so later nested rules can override their defaults.
    for (const file of directory.files) sortedFiles.push(file);

    if (directory.children.length > 1) {
      // Reverse sibling order for the stack; break collation ties with string order.
      directory.children.sort(
        (a, b) => b.name.localeCompare(a.name) || (b.name < a.name ? -1 : 1),
      );
    }
    for (const child of directory.children) pending.push(child);
  }
  return sortedFiles;
};

const toAbsolutePattern = (pattern: string, baseDir: string) => {
  const base = baseDir !== "" ? `/${baseDir}` : "";
  return pattern === "*" ? `${base}/` : `${base}/${stripLeadingSlash(pattern)}`;
};

const stripLeadingSlash = (text: string) => text.replace(/^\//, "");
