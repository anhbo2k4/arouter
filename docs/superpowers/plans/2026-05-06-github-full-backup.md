# GitHub Full Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-machine backup flow that snapshots this repo's important runtime state into git, restores it on a fresh Windows machine, bootstraps required software, and publishes the snapshot to GitHub.

**Architecture:** Keep the implementation PowerShell-native and repo-local. Add one focused Pester integration test file that exercises backup/restore/publish behavior against temporary directories through script parameters, then add four focused PowerShell scripts that share the same path conventions and fail loudly.

**Tech Stack:** PowerShell 7+, Pester, Git, winget, Next.js repo conventions

---

## File Structure

- Create: `docs/superpowers/plans/2026-05-06-github-full-backup.md`
- Create: `tests/powershell/full-backup-scripts.tests.ps1`
- Create: `scripts/backup-machine-state.ps1`
- Create: `scripts/restore-machine-state.ps1`
- Create: `scripts/bootstrap-windows.ps1`
- Create: `scripts/publish-backup.ps1`
- Modify: `.gitignore`

### Task 1: Add Failing PowerShell Integration Tests

**Files:**
- Create: `tests/powershell/full-backup-scripts.tests.ps1`

- [ ] **Step 1: Write the failing test file**

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backupScript = Join-Path $repoRoot 'scripts\backup-machine-state.ps1'
$restoreScript = Join-Path $repoRoot 'scripts\restore-machine-state.ps1'
$publishScript = Join-Path $repoRoot 'scripts\publish-backup.ps1'

Describe 'backup-machine-state.ps1' {
  It 'copies repo env, runtime data, codex files, nginx config, and manifest into backup tree' {
    $sandboxRoot = Join-Path $TestDrive 'backup-case'
    $repo = Join-Path $sandboxRoot 'repo'
    $state = Join-Path $sandboxRoot 'state'
    $codex = Join-Path $sandboxRoot 'codex'
    $nginxDir = Join-Path $sandboxRoot 'nginx\conf'
    $backupRoot = Join-Path $repo 'backup\machine-state'

    New-Item -ItemType Directory -Path $repo, $state, $codex, $nginxDir | Out-Null
    Set-Content -Path (Join-Path $repo '.env') -Value "PORT=1508`nDATA_DIR=$state"
    Set-Content -Path (Join-Path $state 'db.json') -Value '{"providerConnections":[{"id":"p1"}]}'
    Set-Content -Path (Join-Path $state 'usage.json') -Value '{"history":[]}'
    Set-Content -Path (Join-Path $codex 'auth.json') -Value '{"token":"abc"}'
    Set-Content -Path (Join-Path $codex 'config.toml') -Value 'model = "gpt-5"'
    Set-Content -Path (Join-Path $nginxDir 'nginx.conf') -Value 'worker_processes 1;'

    & $backupScript `
      -RepoRoot $repo `
      -DataDir $state `
      -CodexDir $codex `
      -NginxConfPath (Join-Path $nginxDir 'nginx.conf')

    Test-Path (Join-Path $backupRoot 'repo-env\.env') | Should Be $true
    Test-Path (Join-Path $backupRoot 'arouter-data\db.json') | Should Be $true
    Test-Path (Join-Path $backupRoot 'codex\auth.json') | Should Be $true
    Test-Path (Join-Path $backupRoot 'codex\config.toml') | Should Be $true
    Test-Path (Join-Path $backupRoot 'nginx\nginx.conf') | Should Be $true
    Test-Path (Join-Path $backupRoot 'metadata\manifest.json') | Should Be $true
  }
}

Describe 'restore-machine-state.ps1' {
  It 'restores the snapshot back into the requested target paths' {
    $sandboxRoot = Join-Path $TestDrive 'restore-case'
    $repo = Join-Path $sandboxRoot 'repo'
    $restoreTargets = Join-Path $sandboxRoot 'restore-targets'
    $backupRoot = Join-Path $repo 'backup\machine-state'

    New-Item -ItemType Directory -Path `
      (Join-Path $backupRoot 'repo-env'), `
      (Join-Path $backupRoot 'arouter-data'), `
      (Join-Path $backupRoot 'codex'), `
      (Join-Path $backupRoot 'nginx'), `
      (Join-Path $backupRoot 'metadata') | Out-Null

    Set-Content -Path (Join-Path $backupRoot 'repo-env\.env') -Value 'PORT=1600'
    Set-Content -Path (Join-Path $backupRoot 'arouter-data\db.json') -Value '{"settings":{"requireLogin":true}}'
    Set-Content -Path (Join-Path $backupRoot 'codex\auth.json') -Value '{"token":"restore"}'
    Set-Content -Path (Join-Path $backupRoot 'codex\config.toml') -Value 'provider = "openai"'
    Set-Content -Path (Join-Path $backupRoot 'nginx\nginx.conf') -Value 'events {}'

    & $restoreScript `
      -RepoRoot $repo `
      -DataDirTarget (Join-Path $restoreTargets 'ProgramData\arouter') `
      -CodexDirTarget (Join-Path $restoreTargets 'Users\demo\.codex') `
      -NginxConfTarget (Join-Path $restoreTargets 'nginx\conf\nginx.conf')

    Get-Content (Join-Path $repo '.env') | Should Match 'PORT=1600'
    Test-Path (Join-Path $restoreTargets 'ProgramData\arouter\db.json') | Should Be $true
    Test-Path (Join-Path $restoreTargets 'Users\demo\.codex\auth.json') | Should Be $true
    Test-Path (Join-Path $restoreTargets 'Users\demo\.codex\config.toml') | Should Be $true
    Test-Path (Join-Path $restoreTargets 'nginx\conf\nginx.conf') | Should Be $true
  }
}

Describe 'publish-backup.ps1' {
  It 'stages backup artifacts and creates a commit in a disposable repo without pushing' {
    $sandboxRoot = Join-Path $TestDrive 'publish-case'
    $repo = Join-Path $sandboxRoot 'repo'
    $state = Join-Path $sandboxRoot 'state'
    $codex = Join-Path $sandboxRoot 'codex'
    $nginxDir = Join-Path $sandboxRoot 'nginx\conf'

    New-Item -ItemType Directory -Path `
      $repo, `
      (Join-Path $repo 'scripts'), `
      (Join-Path $repo 'docs\superpowers\specs'), `
      (Join-Path $repo 'docs\superpowers\plans') | Out-Null

    Copy-Item -Path (Join-Path $repoRoot '.gitignore') -Destination (Join-Path $repo '.gitignore')
    Copy-Item -Path (Join-Path $repoRoot 'docs\superpowers\specs\2026-05-06-github-full-backup-design.md') `
      -Destination (Join-Path $repo 'docs\superpowers\specs\2026-05-06-github-full-backup-design.md')
    Copy-Item -Path (Join-Path $repoRoot 'docs\superpowers\plans\2026-05-06-github-full-backup.md') `
      -Destination (Join-Path $repo 'docs\superpowers\plans\2026-05-06-github-full-backup.md')
    Copy-Item -Path (Join-Path $repoRoot 'scripts\backup-machine-state.ps1') `
      -Destination (Join-Path $repo 'scripts\backup-machine-state.ps1')
    Copy-Item -Path (Join-Path $repoRoot 'scripts\restore-machine-state.ps1') `
      -Destination (Join-Path $repo 'scripts\restore-machine-state.ps1')
    Copy-Item -Path (Join-Path $repoRoot 'scripts\bootstrap-windows.ps1') `
      -Destination (Join-Path $repo 'scripts\bootstrap-windows.ps1')
    Copy-Item -Path (Join-Path $repoRoot 'scripts\publish-backup.ps1') `
      -Destination (Join-Path $repo 'scripts\publish-backup.ps1')

    git -C $repo init | Out-Null
    git -C $repo config user.name 'existing-user'
    git -C $repo config user.email 'existing@example.com'

    New-Item -ItemType Directory -Path $state, $codex, $nginxDir | Out-Null
    Set-Content -Path (Join-Path $repo '.env') -Value "DATA_DIR=$state"
    Set-Content -Path (Join-Path $state 'db.json') -Value '{"providerConnections":[]}'
    Set-Content -Path (Join-Path $codex 'auth.json') -Value '{"token":"publish"}'
    Set-Content -Path (Join-Path $codex 'config.toml') -Value 'mode = "test"'
    Set-Content -Path (Join-Path $nginxDir 'nginx.conf') -Value 'http {}'

    & $publishScript `
      -RepoRoot $repo `
      -DataDir $state `
      -CodexDir $codex `
      -NginxConfPath (Join-Path $nginxDir 'nginx.conf') `
      -SkipPush `
      -CommitMessage 'test backup commit'

    (git -C $repo log --oneline -1) | Should Match 'test backup commit'
    (git -C $repo config user.name) | Should Be 'anhbo2k4'
    (git -C $repo config user.email) | Should Be 'tntheanh2004@gmail.com'
  }
}
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `Invoke-Pester tests\powershell\full-backup-scripts.tests.ps1`

Expected: FAIL because `scripts\backup-machine-state.ps1`, `scripts\restore-machine-state.ps1`, and `scripts\publish-backup.ps1` do not exist yet.

- [ ] **Step 3: Commit the failing test skeleton only after the failure is observed**

```bash
git add tests/powershell/full-backup-scripts.tests.ps1
git status --short
```

Expected staged file: `A  tests/powershell/full-backup-scripts.tests.ps1`

### Task 2: Implement Backup and Restore Scripts

**Files:**
- Create: `scripts/backup-machine-state.ps1`
- Create: `scripts/restore-machine-state.ps1`
- Test: `tests/powershell/full-backup-scripts.tests.ps1`

- [ ] **Step 1: Write the minimal backup script to satisfy the first test**

```powershell
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DataDir = 'C:\ProgramData\arouter',
  [string]$CodexDir = (Join-Path $HOME '.codex'),
  [string]$NginxConfPath = 'C:\nginx-1.30.0\conf\nginx.conf'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Copy-DirectoryClean {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    throw "Required source directory missing: $Source"
  }

  if (Test-Path $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  New-Item -ItemType Directory -Path $Destination | Out-Null
  Copy-Item -LiteralPath (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

function Copy-FileChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    throw "Required source file missing: $Source"
  }

  $parent = Split-Path -Parent $Destination
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$backupRoot = Join-Path $resolvedRepoRoot 'backup\machine-state'
$repoEnvTarget = Join-Path $backupRoot 'repo-env\.env'
$dataTarget = Join-Path $backupRoot 'arouter-data'
$codexTarget = Join-Path $backupRoot 'codex'
$nginxTarget = Join-Path $backupRoot 'nginx\nginx.conf'
$manifestTarget = Join-Path $backupRoot 'metadata\manifest.json'

if (Test-Path $backupRoot) {
  Remove-Item -LiteralPath $backupRoot -Recurse -Force
}

New-Item -ItemType Directory -Path `
  (Join-Path $backupRoot 'repo-env'), `
  $dataTarget, `
  $codexTarget, `
  (Split-Path -Parent $nginxTarget), `
  (Split-Path -Parent $manifestTarget) -Force | Out-Null

Copy-FileChecked -Source (Join-Path $resolvedRepoRoot '.env') -Destination $repoEnvTarget
Copy-DirectoryClean -Source $DataDir -Destination $dataTarget
Copy-FileChecked -Source (Join-Path $CodexDir 'auth.json') -Destination (Join-Path $codexTarget 'auth.json')
Copy-FileChecked -Source (Join-Path $CodexDir 'config.toml') -Destination (Join-Path $codexTarget 'config.toml')
Copy-FileChecked -Source $NginxConfPath -Destination $nginxTarget

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString('o')
  machineName = $env:COMPUTERNAME
  repoRoot = $resolvedRepoRoot
  sources = [ordered]@{
    repoEnv = (Join-Path $resolvedRepoRoot '.env')
    dataDir = $DataDir
    codexDir = $CodexDir
    nginxConfPath = $NginxConfPath
  }
  restoreTargets = [ordered]@{
    repoEnv = '.env'
    dataDir = 'C:\ProgramData\arouter'
    codexDir = 'C:\Users\<user>\.codex'
    nginxConfPath = 'C:\nginx-1.30.0\conf\nginx.conf'
  }
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestTarget
Write-Host "Backup saved to $backupRoot"
```

- [ ] **Step 2: Write the minimal restore script to satisfy the second test**

```powershell
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DataDirTarget = 'C:\ProgramData\arouter',
  [string]$CodexDirTarget = (Join-Path $HOME '.codex'),
  [string]$NginxConfTarget = 'C:\nginx-1.30.0\conf\nginx.conf'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Copy-DirectoryClean {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    throw "Required snapshot directory missing: $Source"
  }

  if (Test-Path $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

function Copy-FileChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    throw "Required snapshot file missing: $Source"
  }

  $parent = Split-Path -Parent $Destination
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$backupRoot = Join-Path $resolvedRepoRoot 'backup\machine-state'

Copy-FileChecked -Source (Join-Path $backupRoot 'repo-env\.env') -Destination (Join-Path $resolvedRepoRoot '.env')
Copy-DirectoryClean -Source (Join-Path $backupRoot 'arouter-data') -Destination $DataDirTarget
Copy-FileChecked -Source (Join-Path $backupRoot 'codex\auth.json') -Destination (Join-Path $CodexDirTarget 'auth.json')
Copy-FileChecked -Source (Join-Path $backupRoot 'codex\config.toml') -Destination (Join-Path $CodexDirTarget 'config.toml')
Copy-FileChecked -Source (Join-Path $backupRoot 'nginx\nginx.conf') -Destination $NginxConfTarget

Write-Host "Restore complete."
Write-Host "Next: npm install, npm run build or npm run dev, then reload nginx if used."
```

- [ ] **Step 3: Run the Pester suite to verify GREEN for backup/restore**

Run: `Invoke-Pester tests\powershell\full-backup-scripts.tests.ps1`

Expected: The backup and restore examples pass, while the publish test still fails because `scripts\publish-backup.ps1` does not exist yet.

- [ ] **Step 4: Refactor lightly only if needed**

```powershell
# Only if duplication makes the scripts harder to read, extract tiny local helpers.
# Do not create a shared module unless both scripts clearly need it.
```

- [ ] **Step 5: Stage the implemented files**

```bash
git add scripts/backup-machine-state.ps1 scripts/restore-machine-state.ps1 tests/powershell/full-backup-scripts.tests.ps1
git status --short
```

Expected staged files include:
- `A  scripts/backup-machine-state.ps1`
- `A  scripts/restore-machine-state.ps1`
- `A  tests/powershell/full-backup-scripts.tests.ps1`

### Task 3: Implement Publish and Bootstrap Scripts

**Files:**
- Create: `scripts/bootstrap-windows.ps1`
- Create: `scripts/publish-backup.ps1`
- Test: `tests/powershell/full-backup-scripts.tests.ps1`

- [ ] **Step 1: Extend the test file with a bootstrap smoke test that expects the script to expose idempotent installers**

```powershell
Describe 'bootstrap-windows.ps1' {
  It 'supports a dry run path that prints planned installs without failing' {
    $bootstrapScript = Join-Path $repoRoot 'scripts\bootstrap-windows.ps1'
    $output = & $bootstrapScript -DryRun
    ($output | Out-String) | Should Match 'git'
    ($output | Out-String) | Should Match 'nodejs'
    ($output | Out-String) | Should Match 'nginx'
    ($output | Out-String) | Should Match 'nssm'
  }
}
```

- [ ] **Step 2: Run the Pester suite to verify RED for publish/bootstrap**

Run: `Invoke-Pester tests\powershell\full-backup-scripts.tests.ps1`

Expected: FAIL because `scripts\publish-backup.ps1` and `scripts\bootstrap-windows.ps1` do not exist yet.

- [ ] **Step 3: Implement the publish script**

```powershell
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DataDir = 'C:\ProgramData\arouter',
  [string]$CodexDir = (Join-Path $HOME '.codex'),
  [string]$NginxConfPath = 'C:\nginx-1.30.0\conf\nginx.conf',
  [string]$CommitMessage = ("chore(backup): snapshot machine state " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),
  [switch]$SkipPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$backupScript = Join-Path $resolvedRepoRoot 'scripts\backup-machine-state.ps1'

if (-not (Test-Path $backupScript)) {
  throw "Backup script not found: $backupScript"
}

git -C $resolvedRepoRoot config user.name 'anhbo2k4'
git -C $resolvedRepoRoot config user.email 'tntheanh2004@gmail.com'

& $backupScript `
  -RepoRoot $resolvedRepoRoot `
  -DataDir $DataDir `
  -CodexDir $CodexDir `
  -NginxConfPath $NginxConfPath

git -C $resolvedRepoRoot add .env `
  .gitignore `
  backup/machine-state `
  docs/superpowers `
  scripts `
  tests/powershell

git -C $resolvedRepoRoot commit -m $CommitMessage

if (-not $SkipPush) {
  git -C $resolvedRepoRoot push origin main
}
```

- [ ] **Step 4: Implement the bootstrap script**

```powershell
param(
  [switch]$DryRun,
  [string]$ToolsRoot = 'C:\tools',
  [string]$NginxRoot = 'C:\nginx-1.30.0'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  if ($DryRun) {
    Write-Output "DRY RUN: $Name"
    return
  }

  & $Action
}

function Install-WingetPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Label
  )

  Invoke-Step -Name "Install $Label ($Id)" -Action {
    winget install --id $Id --exact --accept-package-agreements --accept-source-agreements
  }
}

function Install-Nginx {
  Invoke-Step -Name 'Install nginx' -Action {
    $zipPath = Join-Path $env:TEMP 'nginx-1.30.0.zip'
    Invoke-WebRequest -Uri 'https://nginx.org/download/nginx-1.30.0.zip' -OutFile $zipPath
    if (Test-Path $NginxRoot) {
      Remove-Item -LiteralPath $NginxRoot -Recurse -Force
    }
    Expand-Archive -LiteralPath $zipPath -DestinationPath (Split-Path -Parent $NginxRoot) -Force
  }
}

function Install-Nssm {
  Invoke-Step -Name 'Install nssm' -Action {
    $targetRoot = Join-Path $ToolsRoot 'nssm'
    $zipPath = Join-Path $env:TEMP 'nssm-2.24.zip'
    Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zipPath
    if (Test-Path $targetRoot) {
      Remove-Item -LiteralPath $targetRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $targetRoot -Force
  }
}

Install-WingetPackage -Id 'Git.Git' -Label 'git'
Install-WingetPackage -Id 'OpenJS.NodeJS.LTS' -Label 'nodejs'
Install-WingetPackage -Id 'Python.Python.3.12' -Label 'python'
Install-WingetPackage -Id 'GoLang.Go' -Label 'go'
Install-WingetPackage -Id 'Microsoft.VisualStudioCode' -Label 'vscode'
Install-WingetPackage -Id 'Google.Chrome' -Label 'google chrome'
Install-Nginx
Install-Nssm
```

- [ ] **Step 5: Run the Pester suite to verify GREEN**

Run: `Invoke-Pester tests\powershell\full-backup-scripts.tests.ps1`

Expected: All backup, restore, publish, and bootstrap tests pass.

- [ ] **Step 6: Run a real local snapshot**

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\backup-machine-state.ps1`

Expected: `backup\machine-state\` is created and populated with `.env`, Arouter data, Codex files, Nginx config, and `metadata\manifest.json`.

- [ ] **Step 7: Stage the final implementation**

```bash
git add scripts/bootstrap-windows.ps1 scripts/publish-backup.ps1 backup/machine-state tests/powershell/full-backup-scripts.tests.ps1
git status --short
```

Expected staged files include:
- `A  scripts/bootstrap-windows.ps1`
- `A  scripts/publish-backup.ps1`
- `A  backup/machine-state/...`

## Self-Review

- Spec coverage: backup, restore, bootstrap, publish, manifest, git identity, and state sources are all covered by Tasks 1-3.
- Placeholder scan: no `TODO`, `TBD`, or indirect "similar to" references remain.
- Type consistency: shared parameter names stay aligned across tests and scripts (`RepoRoot`, `DataDir`, `CodexDir`, `NginxConfPath`, `DataDirTarget`, `CodexDirTarget`, `NginxConfTarget`).
