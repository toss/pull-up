import { findUp } from "find-up";
import path from "path";

export async function resolveRepositoryRoot(cwd: string, root?: string) {
  if (root != null) return root;

  const dotGit = await findUp(".git", {
    type: "directory",
    cwd,
  });

  if (dotGit == null) {
    throw new Error("Repository root not found");
  }

  return path.dirname(dotGit);
}
