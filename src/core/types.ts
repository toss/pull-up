type Awaitable<T> = T | PromiseLike<T>;

export type FileSnapshot = { path: string; contents: string };

export interface TransformContext {
  /* The path of the repository root. */
  root: string;

  /* The path of the output file. */
  outputPath: string;

  /* The existing contents of the output file. If the file does not exist, it is null. */
  existingContents: string | null;
}

export interface Rule {
  /** Glob patterns to collect files from. */
  from: string[];

  /** Transform the collected files into a new contents. */
  transform: (
    sources: FileSnapshot[],
    context: TransformContext,
  ) => Awaitable<string>;

  /** The path to the output file. */
  output: string;
}

export type Ruleset = Record<string, Rule>;
