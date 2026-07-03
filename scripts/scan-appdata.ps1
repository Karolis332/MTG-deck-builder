$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== TOP DIRS in AppData\Local (top 25) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR\AppData\Local' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 25 | Format-Table -AutoSize

Write-Host "`n=== TOP DIRS in AppData\Roaming (top 15) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR\AppData\Roaming' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 15 | Format-Table -AutoSize

Write-Host "`n=== TOP DIRS in Desktop (top 15) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR\Desktop' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 15 | Format-Table -AutoSize

Write-Host "`n=== LARGE FILES (>500MB) in QuLeR (top 20) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR' -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 500MB } |
    Sort-Object Length -Descending |
    Select-Object -First 20 |
    Select-Object FullName, @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}} |
    Format-Table -AutoSize

Write-Host "`n=== INSTALLED PROGRAMS in AppData\Local\Programs ===" -ForegroundColor Cyan
if (Test-Path 'C:\Users\QuLeR\AppData\Local\Programs') {
    Get-ChildItem 'C:\Users\QuLeR\AppData\Local\Programs' -Directory -Force | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
    } | Sort-Object SizeGB -Descending | Format-Table -AutoSize
}

Write-Host "`n=== Docker Desktop / WSL VHDs ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR\AppData\Local' -Filter '*.vhdx' -Recurse -Force -ErrorAction SilentlyContinue |
    Select-Object FullName, @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}} |
    Format-Table -AutoSize
