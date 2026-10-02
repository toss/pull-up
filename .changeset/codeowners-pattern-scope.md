---
'@pull-up/cli': patch
---

Preserve CODEOWNERS pattern scope when merging files. Unanchored patterns such as `*.ts` and `docs/` now match at every depth within their source directory, while anchored patterns and root-level rules retain their meaning.
