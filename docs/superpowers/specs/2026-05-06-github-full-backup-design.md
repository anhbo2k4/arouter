# GitHub Full Backup Design

**Date:** 2026-05-06

**Goal:** Mirror the current Arouter machine state into this repository so a new Windows VPS can be rebuilt quickly, including the application source, runtime data, logged-in provider state, local Codex config/auth files, Nginx config, and helper scripts for backup, restore, install, and publish.

## Scope

This design intentionally includes sensitive local state because the owner explicitly requested a full machine backup into the GitHub repository.

Included state:

- Repository source code
- Repo `.env`
- Arouter runtime data under `DATA_DIR` (`C:\ProgramData\arouter` on this machine)
- `C:\Users\hahahccc\.codex\auth.json`
- `C:\Users\hahahccc\.codex\config.toml`
- `C:\nginx-1.30.0\conf\nginx.conf`

Excluded for now:

- Large disposable caches such as `node_modules`, `.next`, and local temp data
- Full installation directories for software already reproducible from install scripts
- Windows services export beyond what can be reconstructed from config and install scripts

## Repository Layout

The repository will gain a dedicated backup tree:

```text
backup/
  machine-state/
    repo-env/.env
    arouter-data/...
    codex/auth.json
    codex/config.toml
    nginx/nginx.conf
    metadata/manifest.json
scripts/
  backup-machine-state.ps1
  restore-machine-state.ps1
  bootstrap-windows.ps1
  publish-backup.ps1
```

## Backup Behavior

`scripts/backup-machine-state.ps1` will:

1. Resolve the repo root.
2. Create/refresh `backup/machine-state`.
3. Copy `.env` from the repo into `backup/machine-state/repo-env/.env`.
4. Mirror `C:\ProgramData\arouter` into `backup/machine-state/arouter-data`.
5. Copy `C:\Users\hahahccc\.codex\auth.json` and `config.toml` into `backup/machine-state/codex`.
6. Copy `C:\nginx-1.30.0\conf\nginx.conf` into `backup/machine-state/nginx`.
7. Write a `manifest.json` capturing source paths, timestamp, machine name, and restore targets.

The script should fail loudly if a required source path is missing, except for optional files that can be restored later manually.

## Restore Behavior

`scripts/restore-machine-state.ps1` will:

1. Read the repo snapshot from `backup/machine-state`.
2. Restore `.env` into the repo root.
3. Recreate `C:\ProgramData\arouter` from `backup/machine-state/arouter-data`.
4. Recreate `C:\Users\hahahccc\.codex\auth.json` and `config.toml`.
5. Recreate `C:\nginx-1.30.0\conf\nginx.conf`.
6. Print next steps for starting Arouter and reloading Nginx.

The restore flow should create missing parent directories automatically.

## Bootstrap Behavior

`scripts/bootstrap-windows.ps1` will prepare a fresh Windows machine by:

- Ensuring it is run in an elevated PowerShell session when needed
- Installing `git`, `nodejs`, `python`, `go`, `vscode`, and `google chrome` via `winget`
- Installing `nginx` by downloading the official Windows zip and extracting it to `C:\nginx-1.30.0`
- Installing `nssm` by downloading the release zip and extracting it to a stable tools directory
- Verifying each tool is present after installation

The script should be idempotent where practical: if a tool already exists, it should skip or report the existing installation instead of breaking.

## Publish Behavior

`scripts/publish-backup.ps1` will:

1. Set local git author name/email for this repo to the requested values.
2. Run `scripts/backup-machine-state.ps1`.
3. Stage the backup files and scripts.
4. Create a commit message for the snapshot.
5. Push to `origin main`.

This script is the one-command path for refreshing the GitHub backup after local changes.

## Implementation Notes

- The current `.gitignore` blocks `docs/*`, so it must explicitly unignore `docs/superpowers/**` for this workflow.
- Use PowerShell-native copy operations for Windows path handling and clear error reporting.
- Keep scripts focused and readable rather than abstracting prematurely.
- Avoid touching unrelated Arouter runtime logic; this task is repo automation and backup only.

## Verification

Success criteria:

- `scripts/backup-machine-state.ps1` produces a populated `backup/machine-state` tree.
- `git status` shows the new backup artifacts and scripts as tracked changes.
- `scripts/publish-backup.ps1` can create a commit and push to `origin`.
- On a fresh Windows machine, `scripts/bootstrap-windows.ps1` plus `scripts/restore-machine-state.ps1` provide the required files to bring the environment back quickly.

## Open Decisions Resolved

- GitHub visibility: proceed with the current repo as requested.
- Secrets handling: intentionally committed because the owner explicitly requested a full backup.
- State source of truth: `backup/machine-state` becomes the checked-in snapshot of the local machine state.
