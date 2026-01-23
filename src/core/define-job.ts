import type { Job } from "./types";

export function defineJob<Args extends any[]>(
  jobFactory: Job | ((...args: Args) => Job),
) {
  if (typeof jobFactory === "function") {
    return jobFactory;
  }

  return () => jobFactory;
}
