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

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Required snapshot directory missing: $Source"
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
    throw "Required snapshot file missing: $Source"
  }

  $parent = Split-Path -Parent $Destination
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
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

Write-Host 'Restore complete.'
Write-Host 'Next: npm install, npm run build or npm run dev, then reload nginx if used.'
