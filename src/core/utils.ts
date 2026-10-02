import fs from 'node:fs/promises';

export async function readFileOrNull(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read file "${absPath}": ${message}`, { cause: error });
  }
}
