import { findUp } from "find-up";
import path from "path";

export async function getRepositoryRoot(cwd: string): Promise<string | null> {
  const dotGit = await findUp(".git", {
    type: "directory",
    cwd,
  });

  if (dotGit == null) {
    return null;
  }

  return path.dirname(dotGit);
}
