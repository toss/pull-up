---
'@pull-up/cli': patch
---

Report output read failures with their file path instead of treating unreadable files as missing. Check no longer suggests syncing on read errors, and sync stops before overwriting any outputs.
