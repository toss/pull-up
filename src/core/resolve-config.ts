import type { Job } from "./types";
import { cosmiconfig } from "cosmiconfig";

export async function resolveConfig(cwd: string): Promise<Job[]> {
  const explorer = cosmiconfig("pullup");
  const result = await explorer.search(cwd);

  if (result == null) {
    return [];
  }

  return result.config as Job[];
}
