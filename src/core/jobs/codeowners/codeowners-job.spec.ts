import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Fixture } from '@fixture-kit/core';

import { codeownersJob } from './codeowners-job';

const fixtureDirectory = fileURLToPath(new URL('../../../../fixtures/repo/', import.meta.url));

async function readFixtureFiles(rootDir: string, filePaths: string[]) {
  return Promise.all(
    filePaths.map(async (filePath) => ({
      path: filePath,
      contents: await readFile(path.resolve(rootDir, filePath), 'utf8'),
    })),
  );
}

describe('codeownersJob', () => {
  it('merges parent CODEOWNERS before nested files', async () => {
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    const rootDir = fixture.root;
    // Lexical path order places ads-platform/CODEOWNERS before ads/CODEOWNERS.
    const inputFiles = await readFixtureFiles(rootDir, [
      path.join(rootDir, 'services/ads/ads-platform/CODEOWNERS'),
      path.join(rootDir, 'services/ads/CODEOWNERS'),
    ]);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/services/ads/ @ads-team\n' +
        '/services/ads/ads-platform/ @platform-team\n' +
        '/services/ads/ads-platform/special/ @special-team\n',
    );
  });

  it('keeps each directory subtree together with parents first', async () => {
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    const rootDir = fixture.root;
    const inputFiles = await readFixtureFiles(rootDir, [
      path.join(rootDir, 'tools/catalog-cli/CODEOWNERS'),
      path.join(rootDir, 'services/auth-cert/CODEOWNERS'),
      path.join(rootDir, 'services/auth/login/admin/CODEOWNERS'),
      path.join(rootDir, 'services/auth/login/CODEOWNERS'),
      path.join(rootDir, 'services/auth/CODEOWNERS'),
      path.join(rootDir, 'CODEOWNERS'),
    ]);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/ @root-team\n' +
        '/docs/ @docs-team\n' +
        '/services/auth/ @auth-team\n' +
        '/services/auth/login/ @login-team\n' +
        '/services/auth/login/admin/ @admin-team\n' +
        '/services/auth-cert/ @cert-team\n' +
        '/tools/catalog-cli/ @tools-team\n',
    );
  });

  it('groups nested directories even when their parent has no CODEOWNERS', async () => {
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    const rootDir = fixture.root;
    const inputFiles = await readFixtureFiles(rootDir, [
      path.join(rootDir, 'tools/catalog-cli/CODEOWNERS'),
      path.join(rootDir, 'services/cart/CODEOWNERS'),
      path.join(rootDir, 'services/builder/form/CODEOWNERS'),
      path.join(rootDir, 'services/builder/desktop/CODEOWNERS'),
    ]);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/services/builder/desktop/ @desktop-team\n' +
        '/services/builder/form/ @form-team\n' +
        '/services/cart/ @cart-team\n' +
        '/tools/catalog-cli/ @tools-team\n',
    );
  });

  it('resolves relative and absolute CODEOWNERS paths against rootDir', async () => {
    await using fixture = await Fixture.fromDirectory(fixtureDirectory);
    const rootDir = fixture.root;
    const inputFiles = await readFixtureFiles(rootDir, [
      'services/auth/login/CODEOWNERS',
      path.join(rootDir, 'tools/catalog-cli/CODEOWNERS'),
      'services/auth/CODEOWNERS',
      'CODEOWNERS',
    ]);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/ @root-team\n' +
        '/docs/ @docs-team\n' +
        '/services/auth/ @auth-team\n' +
        '/services/auth/login/ @login-team\n' +
        '/tools/catalog-cli/ @tools-team\n',
    );
  });

  it.each(['./services/auth/login/CODEOWNERS', 'services/./auth/../../services/auth/login/CODEOWNERS'])(
    'normalizes %s before ordering parent and child rules',
    async (childPath) => {
      await using fixture = await Fixture.fromDirectory(fixtureDirectory);
      const rootDir = fixture.root;
      const inputFiles = await readFixtureFiles(rootDir, [childPath, 'services/auth/CODEOWNERS']);

      const result = await codeownersJob().transform(inputFiles, {
        rootDir,
        outputPath: path.join(rootDir, '.github/CODEOWNERS'),
      });

      expect(result).toBe('/services/auth/ @auth-team\n/services/auth/login/ @login-team\n');
    },
  );

  it('keeps normalized path aliases stable without mutating the input', async () => {
    const rootDir = process.cwd();
    const inputFiles = [
      { path: 'services/auth/CODEOWNERS', contents: '* @first\n' },
      {
        path: path.join(rootDir, 'services/auth/CODEOWNERS'),
        contents: '* @second\n',
      },
      {
        path: './services/auth/login/../CODEOWNERS',
        contents: '* @last\n',
      },
    ].map((file) => Object.freeze(file));
    Object.freeze(inputFiles);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe('/services/auth/ @first\n' + '/services/auth/ @second\n' + '/services/auth/ @last\n');
  });

  it('keeps locale-equivalent directory names in separate subtrees', async () => {
    const rootDir = process.cwd();
    const inputFiles = [
      {
        path: 'services/é/child/CODEOWNERS',
        contents: '* @composed-child\n',
      },
      {
        path: 'services/e\u0301/CODEOWNERS',
        contents: '* @decomposed-parent\n',
      },
      {
        path: 'services/é/CODEOWNERS',
        contents: '* @composed-parent\n',
      },
      {
        path: 'services/e\u0301/child/CODEOWNERS',
        contents: '* @decomposed-child\n',
      },
    ];

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/services/e\u0301/ @decomposed-parent\n' +
        '/services/e\u0301/child/ @decomposed-child\n' +
        '/services/é/ @composed-parent\n' +
        '/services/é/child/ @composed-child\n',
    );
  });

  it('sorts filenames stably without mutating the input', async () => {
    const rootDir = process.cwd();
    const inputFiles = [
      {
        path: 'services/auth/Z-CODEOWNERS',
        contents: '* @last\n',
      },
      {
        path: 'services/auth/é-CODEOWNERS',
        contents: '* @composed\n',
      },
      {
        path: 'services/auth/e\u0301-CODEOWNERS',
        contents: '* @decomposed\n',
      },
      {
        path: 'services/auth/A-CODEOWNERS',
        contents: '* @first\n',
      },
    ].map((file) => Object.freeze(file));
    Object.freeze(inputFiles);

    const result = await codeownersJob().transform(inputFiles, {
      rootDir,
      outputPath: path.join(rootDir, '.github/CODEOWNERS'),
    });

    expect(result).toBe(
      '/services/auth/ @first\n' +
        '/services/auth/ @composed\n' +
        '/services/auth/ @decomposed\n' +
        '/services/auth/ @last\n',
    );
  });
});
