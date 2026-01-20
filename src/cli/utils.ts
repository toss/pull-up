import { findUp } from "find-up";
import path from "path";

export async function getRepositoryRoot(cwd: string): Promise<string | null> {
  const dotGithub = await findUp(".git", {
    type: "directory",
    cwd,
  });

  if (dotGithub == null) {
    return null;
  }

  return path.dirname(dotGithub);
}
