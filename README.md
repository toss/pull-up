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
npm install -D pull-up
# or
yarn add -D pull-up
# or
pnpm add -D pull-up
```

## Configuration

Create a config file in your project root:

```ts
import { defineConfig, codeownersJob } from "pull-up";

export default defineConfig(codeownersJob());
// or export default defineConfig([codeownersJob()]);
```

### Built-in Jobs

#### `codeownersJob`

Collects `CODEOWNERS` files from your monorepo and merges them into a single file.

```ts
codeownersJob({
  from: ["**/CODEOWNERS"], // default
  output: ".github/CODEOWNERS", // default
});
```

### Custom Jobs

You can define custom jobs using `defineJob`:

```ts
import { defineConfig, defineJob } from "pull-up";

const myJob = defineJob({
  name: "my-job",
  from: ["packages/*/config.json"],
  output: "merged-config.json",
  transform: (sources, context) => {
    // sources: array of { path, contents }
    // context: { root, outputPath, existingContents }
    return JSON.stringify(sources.map((s) => JSON.parse(s.contents)));
  },
});

export default defineConfig([myJob()]);
```

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
