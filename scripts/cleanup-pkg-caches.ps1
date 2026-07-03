$ErrorActionPreference = 'SilentlyContinue'

Write-Host "--- npm cache clean ---" -ForegroundColor Yellow
& "$env:APPDATA\npm\npm.cmd" cache clean --force 2>&1 | Out-String | Write-Host
# Brute-force any leftover cache dirs
if (Test-Path 'C:\Users\QuLeR\AppData\Local\npm-cache') {
    Get-ChildItem 'C:\Users\QuLeR\AppData\Local\npm-cache' -Force | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n--- uv cache clean ---" -ForegroundColor Yellow
$uv = 'C:\Users\QuLeR\AppData\Local\uv'
if (Test-Path $uv) {
    Get-ChildItem $uv -Force | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n--- pip cache purge ---" -ForegroundColor Yellow
& py -m pip cache purge 2>&1 | Out-String | Write-Host

Write-Host "`n--- Sizes after ---" -ForegroundColor Cyan
foreach ($p in @('C:\Users\QuLeR\AppData\Local\npm-cache','C:\Users\QuLeR\AppData\Local\uv','C:\Users\QuLeR\AppData\Local\pip\Cache')) {
    if (Test-Path $p) {
        $sz = (Get-ChildItem $p -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1GB
        '{0,-60} {1,8:N2} GB' -f $p, $sz
    }
}

$f = (Get-PSDrive C).Free / 1GB
Write-Host ('`nC: free = {0:N2} GB' -f $f) -ForegroundColor Cyan
