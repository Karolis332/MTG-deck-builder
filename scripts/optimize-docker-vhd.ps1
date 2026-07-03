$ErrorActionPreference = 'Continue'

$vhd = 'C:\Users\QuLeR\AppData\Local\Docker\wsl\disk\docker_data.vhdx'

if (-not (Test-Path $vhd)) {
    Write-Host "VHDx not found at $vhd" -ForegroundColor Red
    exit 1
}

$sizeBefore = (Get-Item $vhd).Length / 1GB
Write-Host ('VHDx size before: {0:N2} GB' -f $sizeBefore) -ForegroundColor Cyan

Write-Host "`nShutting down WSL (releases VHDx locks)..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 5

# Check if file is still locked by trying to open exclusively
$locked = $true
for ($i = 0; $i -lt 10; $i++) {
    try {
        $fs = [System.IO.File]::Open($vhd, 'Open', 'ReadWrite', 'None')
        $fs.Close()
        $locked = $false
        break
    } catch {
        Write-Host "  VHDx still locked, waiting... (attempt $($i+1)/10)"
        Start-Sleep -Seconds 3
    }
}

if ($locked) {
    Write-Host "VHDx still locked after waiting. Aborting Optimize-VHD." -ForegroundColor Red
    Write-Host "Try: quit Docker Desktop from system tray, then re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nRunning Optimize-VHD (this can take several minutes)..." -ForegroundColor Yellow
try {
    # Optimize-VHD lives in the Hyper-V module
    Import-Module Hyper-V -ErrorAction Stop
    Optimize-VHD -Path $vhd -Mode Full -ErrorAction Stop
    Write-Host "Optimize-VHD succeeded." -ForegroundColor Green
} catch {
    Write-Host "Optimize-VHD via Hyper-V module failed: $_" -ForegroundColor Yellow
    Write-Host "Falling back to diskpart..." -ForegroundColor Yellow

    $dpScript = @"
select vdisk file="$vhd"
attach vdisk readonly
compact vdisk
detach vdisk
exit
"@
    $tmp = [System.IO.Path]::GetTempFileName() + '.txt'
    $dpScript | Out-File -Encoding ASCII $tmp
    diskpart /s $tmp
    Remove-Item $tmp -Force
}

$sizeAfter = (Get-Item $vhd).Length / 1GB
$freed = [math]::Round($sizeBefore - $sizeAfter, 2)
Write-Host ('`nVHDx size after:  {0:N2} GB  (freed: {1:N2} GB)' -f $sizeAfter, $freed) -ForegroundColor Cyan

$diskFree = (Get-PSDrive C).Free / 1GB
Write-Host ('C: free = {0:N2} GB' -f $diskFree) -ForegroundColor Cyan
