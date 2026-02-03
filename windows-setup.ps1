#Requires -Version 5.1
<#
.SYNOPSIS
    MTG Deck Builder - Windows One-Click Setup
.DESCRIPTION
    Downloads and installs all prerequisites, then builds the app.
    Run this script from the project root, or it will clone the repo first.
    Requires an internet connection and administrator privileges.
.EXAMPLE
    Right-click windows-setup.bat -> Run as administrator
#>

param(
    [switch]$SkipBuild,
    [switch]$SkipSeed,
    [switch]$PortableOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step  { param([string]$msg) Write-Host "`n[MTG] $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "[MTG] $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "[MTG] $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "[MTG] $msg" -ForegroundColor Red }

function Test-Admin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-InstalledNodeVersion {
    try {
        $raw = & node -v 2>$null
        if ($raw -match '^v(\d+)') { return [int]$Matches[1] }
    } catch {}
    return 0
}

function Install-WithWinget {
    param([string]$PackageId, [string]$Name)
    Write-Step "Installing $Name via winget..."
    $result = & winget install --id $PackageId --accept-source-agreements --accept-package-agreements --silent 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "winget install failed for $Name. Output:"
        Write-Host $result
        return $false
    }
    Write-Ok "$Name installed successfully."
    return $true
}

function Refresh-Path {
    # Reload PATH from registry so newly installed tools are visible
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path    = "$machinePath;$userPath"
}

# ── Banner ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "    MTG Deck Builder - Windows Setup      " -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

# ── Admin check ──────────────────────────────────────────────────────────────

if (-not (Test-Admin)) {
    Write-Err "This script requires administrator privileges to install software."
    Write-Err "Please right-click windows-setup.bat and select 'Run as administrator'."
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Check / install winget ───────────────────────────────────────────────────

Write-Step "Checking for winget (Windows Package Manager)..."
$hasWinget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $hasWinget) {
    Write-Err "winget is not available on this system."
    Write-Err "winget ships with Windows 10 1709+ and Windows 11."
    Write-Err "Install it from: https://aka.ms/getwinget"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Ok "winget detected."

# ── Check / install Git ─────────────────────────────────────────────────────

Write-Step "Checking for Git..."
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Install-WithWinget "Git.Git" "Git"
    Refresh-Path
    $hasGit = Get-Command git -ErrorAction SilentlyContinue
    if (-not $hasGit) {
        Write-Err "Git still not found after install. You may need to restart your terminal."
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Ok "Git $(git --version) detected."

# ── Check / install Node.js ─────────────────────────────────────────────────

Write-Step "Checking for Node.js 18+..."
$nodeVer = Get-InstalledNodeVersion
if ($nodeVer -lt 18) {
    if ($nodeVer -gt 0) {
        Write-Warn "Node.js v$nodeVer found, but v18+ is required. Upgrading..."
    } else {
        Write-Warn "Node.js not found. Installing..."
    }
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
    Refresh-Path
    $nodeVer = Get-InstalledNodeVersion
    if ($nodeVer -lt 18) {
        Write-Err "Node.js 18+ still not detected after install."
        Write-Err "Try closing and reopening your terminal, then run this script again."
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Ok "Node.js v$nodeVer detected."

# ── Check / install Visual C++ Build Tools ───────────────────────────────────

Write-Step "Checking for Visual C++ Build Tools (needed for native modules)..."
# Check if cl.exe or msbuild exists, or if the VS Build Tools are registered
$hasBuildTools = $false
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWhere) {
    $installations = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($installations) { $hasBuildTools = $true }
}

if (-not $hasBuildTools) {
    Write-Warn "Visual C++ Build Tools not found. Installing (this may take several minutes)..."
    $result = Install-WithWinget "Microsoft.VisualStudio.2022.BuildTools" "Visual Studio Build Tools 2022"
    if (-not $result) {
        Write-Warn "Automatic install failed. Trying alternative approach..."
        Write-Warn "Please install Visual C++ Build Tools manually:"
        Write-Warn "  1. Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/"
        Write-Warn "  2. Select 'Desktop development with C++'"
        Write-Warn "  3. Run this script again after installation"
        Write-Warn ""
        Write-Warn "Continuing anyway - npm install may fail for native modules..."
    }
} else {
    Write-Ok "Visual C++ Build Tools detected."
}

# ── Ensure we are in the project directory ───────────────────────────────────

Write-Step "Checking project directory..."
$inProject = Test-Path (Join-Path $PSScriptRoot "package.json")
if ($inProject) {
    Set-Location $PSScriptRoot
    Write-Ok "Running from project directory: $PSScriptRoot"
} else {
    Write-Warn "Not in the project directory. Cloning repository..."
    $cloneDir = Join-Path $env:USERPROFILE "MTG-deck-builder"
    if (Test-Path $cloneDir) {
        Write-Ok "Found existing clone at $cloneDir"
        Set-Location $cloneDir
    } else {
        git clone https://github.com/Karolis332/MTG-deck-builder.git $cloneDir
        Set-Location $cloneDir
        Write-Ok "Cloned to $cloneDir"
    }
}

# ── Install npm dependencies ─────────────────────────────────────────────────

Write-Step "Installing npm dependencies..."
if (-not (Test-Path "node_modules")) {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install failed. Check the errors above."
        Write-Err "Common fix: ensure Visual C++ Build Tools are installed, then retry."
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Ok "Dependencies installed."
} else {
    Write-Ok "Dependencies already installed (node_modules exists)."
}

# ── Create data directory ────────────────────────────────────────────────────

if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
    Write-Ok "Created data directory."
}

# ── Seed database ────────────────────────────────────────────────────────────

if (-not $SkipSeed) {
    Write-Step "Seeding card database from Scryfall (~100 MB download)..."
    & npm run db:seed
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Database seeding failed. You can seed later from the app UI or run: npm run db:seed"
    } else {
        Write-Ok "Card database seeded."
    }
} else {
    Write-Warn "Skipping database seed (use -SkipSeed to control this)."
}

# ── Build ────────────────────────────────────────────────────────────────────

if (-not $SkipBuild) {
    Write-Step "Building Windows application..."
    if ($PortableOnly) {
        & npm run dist:portable
    } else {
        & npm run dist:win
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build failed. Check the errors above."
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Ok "Build complete!"

    $distDir = Join-Path (Get-Location) "dist-electron"
    Write-Host ""
    Write-Ok "Output files are in: $distDir"
    Write-Host ""
    Write-Host "  Look for:" -ForegroundColor White
    Write-Host "    - MTG-Deck-Builder-*-win-x64.exe   (installer)" -ForegroundColor White
    Write-Host "    - MTG-Deck-Builder-*-portable.exe   (no install needed)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Ok "Skipping build. Run 'npm run dist:win' to build later."
}

# ── Done ─────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "    Setup Complete!                       " -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Quick commands:" -ForegroundColor White
Write-Host "    npm run dev:electron    Run in dev mode" -ForegroundColor Gray
Write-Host "    npm run dist:win        Build Windows installer" -ForegroundColor Gray
Write-Host "    npm run dist:portable   Build portable .exe" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
