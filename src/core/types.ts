type Awaitable<T> = T | PromiseLike<T>;

export type Source = { path: string; contents: string };

export interface TransformContext {
  /* The path of the repository root. */
  rootDir: string;

  /* The path of the output file. */
  outputPath: string;
}

export interface Job {
  /** The name of the job. */
  name: string;

  /** Glob patterns to collect files from. */
  input: string[];

  /** Transform the collected files into a new contents. */
  transform: (
    inputFiles: Source[],
    context: TransformContext,
  ) => Awaitable<string>;

  /** The path to the output file. */
  output: string;
}
