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

function Invoke-GitChecked {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & git -C $resolvedRepoRoot @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git command failed: git -C $resolvedRepoRoot $($Arguments -join ' ')"
  }
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$backupScript = Join-Path $resolvedRepoRoot 'scripts\backup-machine-state.ps1'

if (-not (Test-Path -LiteralPath $backupScript)) {
  throw "Backup script not found: $backupScript"
}

Invoke-GitChecked -Arguments @('config', 'user.name', 'anhbo2k4')
Invoke-GitChecked -Arguments @('config', 'user.email', 'tntheanh2004@gmail.com')

& $backupScript `
  -RepoRoot $resolvedRepoRoot `
  -DataDir $DataDir `
  -CodexDir $CodexDir `
  -NginxConfPath $NginxConfPath

Invoke-GitChecked -Arguments @('add', '.gitignore', 'backup/machine-state', 'docs/superpowers', 'scripts', 'tests/powershell')
Invoke-GitChecked -Arguments @('add', '-f', '.env')
Invoke-GitChecked -Arguments @('commit', '-m', $CommitMessage)

if (-not $SkipPush) {
  Invoke-GitChecked -Arguments @('push', 'origin', 'main')
}
