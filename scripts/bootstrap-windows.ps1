param(
  [switch]$DryRun,
  [string]$ToolsRoot = 'C:\tools',
  [string]$NginxRoot = 'C:\nginx-1.30.0'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

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
    & winget install --id $Id --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
      throw "winget install failed for $Id"
    }
  }
}

function Install-Nginx {
  Invoke-Step -Name 'Install nginx' -Action {
    $zipPath = Join-Path $env:TEMP 'nginx-1.30.0.zip'
    $parent = Split-Path -Parent $NginxRoot
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Invoke-WebRequest -Uri 'https://nginx.org/download/nginx-1.30.0.zip' -OutFile $zipPath
    if (Test-Path -LiteralPath $NginxRoot) {
      Remove-Item -LiteralPath $NginxRoot -Recurse -Force
    }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $parent -Force
  }
}

function Install-Nssm {
  Invoke-Step -Name 'Install nssm' -Action {
    $targetRoot = Join-Path $ToolsRoot 'nssm'
    $zipPath = Join-Path $env:TEMP 'nssm-2.24.zip'
    if (-not (Test-Path -LiteralPath $ToolsRoot)) {
      New-Item -ItemType Directory -Path $ToolsRoot -Force | Out-Null
    }
    Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zipPath
    if (Test-Path -LiteralPath $targetRoot) {
      Remove-Item -LiteralPath $targetRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $targetRoot -Force
  }
}

if (-not $DryRun -and -not (Test-IsAdministrator)) {
  throw 'bootstrap-windows.ps1 should be run from an elevated PowerShell session.'
}

Install-WingetPackage -Id 'Git.Git' -Label 'git'
Install-WingetPackage -Id 'OpenJS.NodeJS.LTS' -Label 'nodejs'
Install-WingetPackage -Id 'Python.Python.3.12' -Label 'python'
Install-WingetPackage -Id 'GoLang.Go' -Label 'go'
Install-WingetPackage -Id 'Microsoft.VisualStudioCode' -Label 'vscode'
Install-WingetPackage -Id 'Google.Chrome' -Label 'google chrome'
Install-Nginx
Install-Nssm
