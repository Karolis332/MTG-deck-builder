$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

function Get-FolderSizeGB {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return 0 }
    return [math]::Round(((Get-ChildItem $Path -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1GB), 2)
}

function Clear-FolderContents {
    param([string]$Path, [string]$Label)
    if (-not (Test-Path $Path)) {
        Write-Host "[$Label] not found at $Path"
        return
    }
    $before = Get-FolderSizeGB $Path
    Write-Host "[$Label] before: $before GB"
    Get-ChildItem $Path -Force | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    $after = Get-FolderSizeGB $Path
    $freed = [math]::Round($before - $after, 2)
    Write-Host "[$Label] after:  $after GB  (freed: $freed GB)"
}

# Snapshot free space before
$diskBefore = (Get-PSDrive C).Free / 1GB
Write-Host "=== BEFORE: C: free = $([math]::Round($diskBefore,2)) GB ===" -ForegroundColor Cyan

# 1. Empty Recycle Bin
Write-Host "`n--- Emptying Recycle Bin ---" -ForegroundColor Yellow
Clear-RecycleBin -DriveLetter C -Force -ErrorAction SilentlyContinue
Write-Host "Recycle Bin emptied."

# 2. Clear %TEMP%
Write-Host "`n--- Clearing %TEMP% ---" -ForegroundColor Yellow
Clear-FolderContents 'C:\Users\QuLeR\AppData\Local\Temp' 'User Temp'

# 3. Clear NVIDIA shader caches
Write-Host "`n--- Clearing NVIDIA caches ---" -ForegroundColor Yellow
Clear-FolderContents 'C:\Users\QuLeR\AppData\Local\NVIDIA\DXCache' 'DXCache'
Clear-FolderContents 'C:\Users\QuLeR\AppData\Local\NVIDIA\GLCache' 'GLCache'
Clear-FolderContents 'C:\Users\QuLeR\AppData\Local\NVIDIA\ComputeCache' 'ComputeCache'

# 4. Clear Stremio cache
Write-Host "`n--- Clearing Stremio cache ---" -ForegroundColor Yellow
Clear-FolderContents 'C:\Users\QuLeR\AppData\Roaming\stremio\stremio-server\stremio-cache' 'Stremio'

# Snapshot free space after pure-deletion phase
$diskMid = (Get-PSDrive C).Free / 1GB
Write-Host "`n=== After deletes: C: free = $([math]::Round($diskMid,2)) GB ($([math]::Round($diskMid - $diskBefore,2)) GB freed so far) ===" -ForegroundColor Cyan
