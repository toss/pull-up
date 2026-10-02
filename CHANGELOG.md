# @pull-up/cli

## 0.0.7

### Patch Changes

- [#30](https://github.com/toss/pull-up/pull/30) [`4c71914`](https://github.com/toss/pull-up/commit/4c719141e3a0b622b4311c467ce69de6895075bd) Thanks [@ho991217](https://github.com/ho991217)! - Preserve CODEOWNERS pattern scope when merging files. Unanchored patterns such as `*.ts` and `docs/` now match at every depth within their source directory, while anchored patterns and root-level rules retain their meaning.

- [#30](https://github.com/toss/pull-up/pull/30) [`4c71914`](https://github.com/toss/pull-up/commit/4c719141e3a0b622b4311c467ce69de6895075bd) Thanks [@ho991217](https://github.com/ho991217)! - Report output read failures with their file path instead of treating unreadable files as missing. Check no longer suggests syncing on read errors, and sync stops before overwriting any outputs.

## 0.0.6

### Patch Changes

- [#24](https://github.com/toss/pull-up/pull/24) [`5c8c387`](https://github.com/toss/pull-up/commit/5c8c387ab2e8a074f5dea334fc865402d6007d04) Thanks [@mununki](https://github.com/mununki)! - Normalize CODEOWNERS source paths containing `./` or `..` before sorting so parent rules do not override child rules.

## 0.0.5

### Patch Changes

- [#16](https://github.com/toss/pull-up/pull/16) [`45d5305`](https://github.com/toss/pull-up/commit/45d530556d4bd68eb5131f31715762a35945dd62) Thanks [@mununki](https://github.com/mununki)! - Group merged CODEOWNERS rules by directory while keeping parent rules before nested overrides.

  Resolve input paths relative to the repository root so running from a subdirectory generates correct ownership patterns.

## 0.0.4

### Patch Changes

- [#14](https://github.com/toss/pull-up/pull/14) [`7e82a7f`](https://github.com/toss/pull-up/commit/7e82a7f97a30fe2c3b781f09811b3eb11157b8d9) Thanks [@mununki](https://github.com/mununki)! - Fix CODEOWNERS merge order so parent rules appear before nested rules, preserving ownership overrides for nested directories.

## 0.0.3

### Patch Changes

- [#12](https://github.com/toss/pull-up/pull/12) [`a58a742`](https://github.com/toss/pull-up/commit/a58a742886dd6bec7feb947e1d8a24cfa2de8298) Thanks [@ho991217](https://github.com/ho991217)! - changed find .git setting to type 'both' to support git worktree

## 0.0.2

### Patch Changes

- [#7](https://github.com/toss/pull-up/pull/7) [`8aa0d78`](https://github.com/toss/pull-up/commit/8aa0d783aa5ee0e7a7e54f039dce278b262cabb3) Thanks [@ho991217](https://github.com/ho991217)! - fixed export map
