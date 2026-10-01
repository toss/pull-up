import fs from 'node:fs/promises';

import { readFileOrNull } from './utils';

describe('readFileOrNull', () => {
  const outputPath = '/repository/.github/CODEOWNERS';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing file contents, including an empty file', async () => {
    const readFile = vi.spyOn(fs, 'readFile').mockResolvedValueOnce('contents').mockResolvedValueOnce('');

    expect(await readFileOrNull(outputPath)).toBe('contents');
    expect(await readFileOrNull(outputPath)).toBe('');
    expect(readFile).toHaveBeenCalledWith(outputPath, 'utf-8');
  });

  it('returns null for a missing file', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue(Object.assign(new Error('No such file'), { code: 'ENOENT' }));

    expect(await readFileOrNull(outputPath)).toBeNull();
  });

  it.each(['EISDIR', 'EACCES', 'EIO'])('propagates %s with the output path', async (code) => {
    const error = Object.assign(new Error(`${code}: read failed`), { code, syscall: 'read' });
    vi.spyOn(fs, 'readFile').mockRejectedValue(error);

    await expect(readFileOrNull(outputPath)).rejects.toMatchObject({
      cause: error,
      message: expect.stringContaining(outputPath),
    });
  });

  it('does not hide unexpected read failures', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Unexpected read failure'));

    await expect(readFileOrNull(outputPath)).rejects.toThrow('Unexpected read failure');
  });
});
