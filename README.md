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

### Standalone executable

Download an executable from [GitHub Releases](https://github.com/toss/pull-up/releases):

| Platform            | Executable            |
| ------------------- | --------------------- |
| Linux x64           | `pullup-linux-x64`    |
| Linux arm64         | `pullup-linux-arm64`  |
| macOS Intel         | `pullup-darwin-x64`   |
| macOS Apple Silicon | `pullup-darwin-arm64` |

For example, on macOS Apple Silicon:

```bash
chmod +x pullup-darwin-arm64
./pullup-darwin-arm64 --version
./pullup-darwin-arm64 sync
```

Use YAML configuration with the standalone executable. Built-in jobs do not require Node.js or a JavaScript package manager. Custom commands still require any runtimes or tools they invoke.

## Configuration

Create `pullup.yml` or `pullup.yaml` in your project root:

```yaml
jobs:
  codeowners:
    type: codeowners
```

`jobs` maps job identifiers to their settings. YAML configuration is validated before jobs run; invalid settings cause the command to exit with code 1.

Configuration search starts at the working directory, or `--cwd`, and walks up to the nearest YAML configuration. Within each directory, `pullup.yaml` is searched before `pullup.yml`; empty files are skipped. `--root` sets the repository root for job inputs and outputs without changing where configuration search starts.

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

### Migration

Starting in 0.1.0, npm and standalone installations support only `pullup.yml` or `pullup.yaml`. Old configuration formats are ignored, and the npm package no longer exports JavaScript configuration helpers.

Move built-in job settings from `pullup.config.ts`:

```ts
import { codeownersJob, defineConfig } from '@pull-up/cli';

export default defineConfig(codeownersJob({ input: ['packages/**/CODEOWNERS'] }));
```

Into `pullup.yml`:

```yaml
jobs:
  codeowners:
    type: codeowners
    input: ['packages/**/CODEOWNERS']
```

For a custom callback such as:

```js
const transform = (sources) => sources.map(({ contents }) => contents).join('\n');
```

Move its body into `scripts/combine.mjs`, reading sources from stdin and writing the result to stdout:

```js
import { readFileSync } from 'node:fs';

const { sources } = JSON.parse(readFileSync(0, 'utf8'));
process.stdout.write(sources.map(({ contents }) => contents).join('\n'));
```

Then configure the command in `pullup.yml`:

```yaml
jobs:
  combined:
    type: custom
    command: node scripts/combine.mjs
    input: ['packages/**/config.txt']
    output: combined.txt
```

This example requires Node.js in the user's environment. See [Custom Jobs](#custom-jobs) for the full stdin/stdout contract. Run `pullup sync --dry-run` to preview the migrated jobs, then `pullup sync` and `pullup check`.

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
| `--help`        | Show command help                   |
| `--version`     | Show the installed version          |

## Development

```bash
yarn test             # Source unit tests and the npm CLI
yarn test:unit        # Source tests without building
yarn test:integration # Build and test the npm CLI
yarn test:exe         # Build and test the native standalone executable
```

The npm and standalone projects run the same tests in `tests/cli`. The standalone test environment provides only `sh` on PATH to verify that built-in jobs do not need an installed Node.js runtime.

`yarn build` generates the npm CLI, `schema.json`, and the standalone executable for the current machine together. CI builds and tests all four supported platforms on native runners, then attaches the executables to the matching Changesets GitHub Release.
