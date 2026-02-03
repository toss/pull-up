# Contributing to pull-up

Welcome contributions from everyone!

## Contributing as issue

### Search for duplicates

[Search existing issues](https://github.com/toss/pull-up/issues) before creating a new one.

### Feature suggestion?

We accept feature requests in the [issue tracker](https://github.com/toss/pull-up/issues/new).

When suggesting features, consider:

- What problem does this solve?
- How would it work with existing jobs?
- Are there alternative approaches?

## Contributing as code

### Prerequisites

1. **Choose an issue** to work on from the [issue tracker](https://github.com/toss/pull-up/issues)
2. **Fork and clone** the repository

   ```bash
   git clone git@github.com:{your-username}/pull-up.git
   cd pull-up
   ```

3. **Set up Node.js and Yarn**

   This project uses Node.js 24.12.0 and Yarn 4.12.0. Install [mise](https://mise.jdx.dev/) and run:

   ```bash
   mise install
   ```

4. **Install dependencies**

   ```bash
   yarn install
   ```

   > **VSCode users**: Make sure to select "Use Workspace Version" for TypeScript (bottom-right status bar).

5. **Build and verify**

   ```bash
   yarn build
   yarn typecheck
   yarn lint
   ```

### Making changes

#### Testing locally

Test the CLI with your changes:

```bash
node dist/bin/index.mjs sync --dry-run
node dist/bin/index.mjs check
```

Or use watch mode during development:

```bash
yarn dev
```

#### Adding a new built-in job

Create a job under `src/core/jobs/<job-name>/`:

```ts
export const myJob = defineJob((options?: MyJobOptions) => ({
  name: "my-job",
  input: options?.input ?? ["**/MY_CONFIG"],
  output: options?.output ?? ".github/my-output",
  transform: (inputFiles, { rootDir }) => {
    // Transform and merge files
    return "generated output";
  },
}));
```

Then export it from `src/core/jobs/index.ts` and update the README.

### Pull Requests

We recommend following [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>
```

Examples:

```bash
feat: add github workflows job
fix: resolve relative paths correctly
docs: add custom job examples
```

#### Adding a changeset

For user-facing changes, add a changeset:

```bash
yarn changeset
```

Select the change type:
- `patch` — Bug fixes
- `minor` — New features
- `major` — Breaking changes

Skip changesets for docs-only or internal changes.

#### Submitting

1. Push your branch to your fork
2. Open a pull request against `main`
3. Ensure all checks pass
4. Address review feedback

GitHub Actions will automatically check types and linting.
