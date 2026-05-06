Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backupScript = Join-Path $repoRoot 'scripts\backup-machine-state.ps1'
$restoreScript = Join-Path $repoRoot 'scripts\restore-machine-state.ps1'
$publishScript = Join-Path $repoRoot 'scripts\publish-backup.ps1'
$bootstrapScript = Join-Path $repoRoot 'scripts\bootstrap-windows.ps1'

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

  It 'falls back to an alternate arouter data directory when the preferred directory is empty' {
    $sandboxRoot = Join-Path $TestDrive 'fallback-case'
    $repo = Join-Path $sandboxRoot 'repo'
    $emptyDataDir = Join-Path $sandboxRoot 'empty-data'
    $fallbackDataDir = Join-Path $sandboxRoot 'roaming-arouter'
    $codex = Join-Path $sandboxRoot 'codex'
    $nginxDir = Join-Path $sandboxRoot 'nginx\conf'
    $backupRoot = Join-Path $repo 'backup\machine-state'

    New-Item -ItemType Directory -Path $repo, $emptyDataDir, $fallbackDataDir, $codex, $nginxDir | Out-Null
    Set-Content -Path (Join-Path $repo '.env') -Value "PORT=1508`nDATA_DIR=$emptyDataDir"
    Set-Content -Path (Join-Path $fallbackDataDir 'db.json') -Value '{"providerConnections":[{"id":"real"}]}'
    Set-Content -Path (Join-Path $fallbackDataDir 'usage.json') -Value '{"history":[{"id":"u1"}]}'
    Set-Content -Path (Join-Path $codex 'auth.json') -Value '{"token":"abc"}'
    Set-Content -Path (Join-Path $codex 'config.toml') -Value 'model = "gpt-5"'
    Set-Content -Path (Join-Path $nginxDir 'nginx.conf') -Value 'worker_processes 1;'

    & $backupScript `
      -RepoRoot $repo `
      -DataDir $emptyDataDir `
      -FallbackDataDir $fallbackDataDir `
      -CodexDir $codex `
      -NginxConfPath (Join-Path $nginxDir 'nginx.conf')

    (Get-Content (Join-Path $backupRoot 'arouter-data\db.json') -Raw) | Should Match '"real"'
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
      (Join-Path $repo 'docs\superpowers\plans'), `
      (Join-Path $repo 'tests\powershell') | Out-Null

    Copy-Item -Path (Join-Path $repoRoot '.gitignore') -Destination (Join-Path $repo '.gitignore')
    Copy-Item -Path (Join-Path $repoRoot 'docs\superpowers\specs\2026-05-06-github-full-backup-design.md') `
      -Destination (Join-Path $repo 'docs\superpowers\specs\2026-05-06-github-full-backup-design.md')
    Copy-Item -Path (Join-Path $repoRoot 'docs\superpowers\plans\2026-05-06-github-full-backup.md') `
      -Destination (Join-Path $repo 'docs\superpowers\plans\2026-05-06-github-full-backup.md')
    Copy-Item -Path (Join-Path $repoRoot 'tests\powershell\full-backup-scripts.tests.ps1') `
      -Destination (Join-Path $repo 'tests\powershell\full-backup-scripts.tests.ps1')

    if (Test-Path (Join-Path $repoRoot 'scripts\backup-machine-state.ps1')) {
      Copy-Item -Path (Join-Path $repoRoot 'scripts\backup-machine-state.ps1') `
        -Destination (Join-Path $repo 'scripts\backup-machine-state.ps1')
    }

    if (Test-Path (Join-Path $repoRoot 'scripts\restore-machine-state.ps1')) {
      Copy-Item -Path (Join-Path $repoRoot 'scripts\restore-machine-state.ps1') `
        -Destination (Join-Path $repo 'scripts\restore-machine-state.ps1')
    }

    if (Test-Path (Join-Path $repoRoot 'scripts\bootstrap-windows.ps1')) {
      Copy-Item -Path (Join-Path $repoRoot 'scripts\bootstrap-windows.ps1') `
        -Destination (Join-Path $repo 'scripts\bootstrap-windows.ps1')
    }

    if (Test-Path (Join-Path $repoRoot 'scripts\publish-backup.ps1')) {
      Copy-Item -Path (Join-Path $repoRoot 'scripts\publish-backup.ps1') `
        -Destination (Join-Path $repo 'scripts\publish-backup.ps1')
    }

    git -C $repo init | Out-Null
    git -C $repo config user.name 'existing-user'
    git -C $repo config user.email 'existing@example.com'

    New-Item -ItemType Directory -Path $state, $codex, $nginxDir | Out-Null
    Set-Content -Path (Join-Path $repo '.env') -Value "DATA_DIR=$state"
    Set-Content -Path (Join-Path $state 'db.json') -Value '{"providerConnections":[]}'
    Set-Content -Path (Join-Path $state 'usage.json') -Value '{"history":[]}'
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

Describe 'bootstrap-windows.ps1' {
  It 'supports a dry run path that prints planned installs without failing' {
    $output = & $bootstrapScript -DryRun
    ($output | Out-String) | Should Match 'git'
    ($output | Out-String) | Should Match 'nodejs'
    ($output | Out-String) | Should Match 'nginx'
    ($output | Out-String) | Should Match 'nssm'
  }
}
