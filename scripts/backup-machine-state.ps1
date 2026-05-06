param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DataDir = 'C:\ProgramData\arouter',
  [string]$FallbackDataDir = (Join-Path $env:APPDATA 'arouter'),
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

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Required source directory missing: $Source"
  }

  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  $items = Get-ChildItem -LiteralPath $Source -Force
  foreach ($item in $items) {
    Copy-Item -LiteralPath $item.FullName -Destination $Destination -Recurse -Force
  }
}

function Copy-FileChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Required source file missing: $Source"
  }

  $parent = Split-Path -Parent $Destination
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Test-DirectoryHasContent {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  return @(Get-ChildItem -LiteralPath $Path -Force).Count -gt 0
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$backupRoot = Join-Path $resolvedRepoRoot 'backup\machine-state'
$repoEnvTarget = Join-Path $backupRoot 'repo-env\.env'
$dataTarget = Join-Path $backupRoot 'arouter-data'
$codexTarget = Join-Path $backupRoot 'codex'
$nginxTarget = Join-Path $backupRoot 'nginx\nginx.conf'
$manifestTarget = Join-Path $backupRoot 'metadata\manifest.json'
$resolvedDataDir = $DataDir

if (-not (Test-DirectoryHasContent -Path $resolvedDataDir) -and (Test-DirectoryHasContent -Path $FallbackDataDir)) {
  $resolvedDataDir = $FallbackDataDir
}

if (Test-Path -LiteralPath $backupRoot) {
  Remove-Item -LiteralPath $backupRoot -Recurse -Force
}

New-Item -ItemType Directory -Path `
  (Join-Path $backupRoot 'repo-env'), `
  $dataTarget, `
  $codexTarget, `
  (Split-Path -Parent $nginxTarget), `
  (Split-Path -Parent $manifestTarget) -Force | Out-Null

Copy-FileChecked -Source (Join-Path $resolvedRepoRoot '.env') -Destination $repoEnvTarget
Copy-DirectoryClean -Source $resolvedDataDir -Destination $dataTarget
Copy-FileChecked -Source (Join-Path $CodexDir 'auth.json') -Destination (Join-Path $codexTarget 'auth.json')
Copy-FileChecked -Source (Join-Path $CodexDir 'config.toml') -Destination (Join-Path $codexTarget 'config.toml')
Copy-FileChecked -Source $NginxConfPath -Destination $nginxTarget

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString('o')
  machineName = $env:COMPUTERNAME
  repoRoot = $resolvedRepoRoot
  sources = [ordered]@{
    repoEnv = (Join-Path $resolvedRepoRoot '.env')
    dataDir = $resolvedDataDir
    preferredDataDir = $DataDir
    fallbackDataDir = $FallbackDataDir
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
