# pull-up

Collect scattered config files from your monorepo and generate them where your systems expect.

## The Problem

Many tools require config files in specific locations:

- GitHub reads `CODEOWNERS` from `.github/CODEOWNERS`
- GitHub Actions workflows must live in `.github/workflows/`
- And more...

In a monorepo, each package has its own context. But these systems only look at root-level paths. You end up with a single massive file that every team has to edit, leading to merge conflicts and unclear ownership.

## The Solution

**pull-up** lets you keep config files next to the code they describe, then collects and generates them to the locations your systems expect.

```
packages/
  core/
    CODEOWNERS        # * @core-team
  web/
    CODEOWNERS        # * @frontend-team
  api/
    CODEOWNERS        # * @backend-team

↓ pullup sync

.github/
  CODEOWNERS          # All entries merged with correct paths
```

## Installation

```bash
npm install -D @pull-up/cli
# or
yarn add -D @pull-up/cli
# or
pnpm add -D @pull-up/cli
```

## Configuration

Create `pullup.yml` or `pullup.yaml` in your project root:

```yaml
jobs:
  codeowners:
    type: codeowners
```

`jobs` maps job identifiers to their settings. YAML configuration is validated before jobs run; invalid settings cause the command to exit with code 1.

`pullup.yaml` is searched before `pullup.yml`.

### Built-in Jobs

#### `codeowners`

Collects `CODEOWNERS` files from your monorepo and merges them into a single file.

```yaml
jobs:
  codeowners:
    type: codeowners
    input:
      - '**/CODEOWNERS'
      - '!**/fixtures/**'
    output: .github/CODEOWNERS
```

| Field    | Type         | Required | Default              |
| -------- | ------------ | -------- | -------------------- |
| `type`   | `codeowners` | Yes      |                      |
| `input`  | `string[]`   | No       | `['**/CODEOWNERS']`  |
| `output` | `string`     | No       | `.github/CODEOWNERS` |

Input patterns and the output path are relative to the repository root. Prefix an input pattern with `!` to exclude matching files. The output file is automatically excluded from the input.

### Custom Jobs

Use `type: custom` to generate a file with a shell command:

```yaml
jobs:
  ownership:
    type: custom
    command: 'python3 scripts/ownership.py'
    input: ['packages/**/ownership.yaml']
    output: .github/CODEOWNERS
```

| Field     | Type       | Required | Default |
| --------- | ---------- | -------- | ------- |
| `type`    | `custom`   | Yes      |         |
| `command` | `string`   | Yes      |         |
| `input`   | `string[]` | No       | `[]`    |
| `output`  | `string`   | Yes      |         |

The command runs through `sh -c` from the root, so shell syntax such as pipes is supported. It receives a single JSON object on stdin:

```json
{
  "sources": [
    {
      "path": "packages/core/ownership.yaml",
      "contents": "owners: ['@core-team']\n"
    }
  ],
  "context": {
    "rootDir": "/project",
    "outputPath": "/project/.github/CODEOWNERS"
  }
}
```

Source paths are relative to the repository root, and their contents are UTF-8 text. Both context paths are absolute.

Write the generated file contents to stdout and exit with code `0`. Trailing newlines are preserved. Use stderr for error messages and exit with a non-zero code on failure.

The command runs on every `pullup sync`, `pullup check`, and `pullup sync --dry-run`. pull-up writes the generated file only during `sync` without `--dry-run`.

### Editor Support

The package includes `schema.json` for autocomplete and validation in editors that support YAML Language Server. In VS Code, install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) and add this line at the top of your config:

```yaml
# yaml-language-server: $schema=./node_modules/@pull-up/cli/schema.json
```

The path is relative to the YAML file. For Yarn Plug'n'Play or a remote schema, use `https://unpkg.com/@pull-up/cli@<version>/schema.json`, replacing `<version>` with your installed package version.

### JavaScript and TypeScript Configuration

Use `pullup.config.ts`, `pullup.config.js`, `pullup.config.cjs`, or `pullup.config.mjs` for a JavaScript or TypeScript configuration:

```ts
import { defineConfig, codeownersJob } from '@pull-up/cli';

export default defineConfig(codeownersJob());
```

The `package.json` `pullup` field and `.pulluprc` files are also supported. These formats are searched before `pullup.yaml` and `pullup.yml`.

#### Custom Jobs

Use `defineJob` to implement a custom transform in a JavaScript or TypeScript config:

```ts
import { defineConfig, defineJob } from '@pull-up/cli';

const myJob = defineJob({
  name: 'my-job',
  input: ['packages/*/config.json'],
  output: 'merged-config.json',
  transform: (sources) => {
    return JSON.stringify(sources.map((s) => JSON.parse(s.contents)));
  },
});

export default defineConfig([myJob()]);
```

Transform functions receive source files as `{ path, contents }` objects and a context containing `rootDir` and `outputPath`. They can return a string or a promise of a string.

## Usage

### Sync

Generate files from scattered sources:

```bash
pullup sync
```

Preview changes without writing:

```bash
pullup sync --dry-run
```

### Check

Verify generated files are up to date (useful in CI):

```bash
pullup check
```

## CLI Options

| Option          | Description                         |
| --------------- | ----------------------------------- |
| `--root <path>` | Repository root path                |
| `--cwd <path>`  | Working directory                   |
| `--dry-run`     | Preview without writing (sync only) |
