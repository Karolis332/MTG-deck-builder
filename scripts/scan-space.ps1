$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== DRIVES ===" -ForegroundColor Cyan
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 } |
    Select-Object Name,
        @{N='Used(GB)';E={[math]::Round($_.Used/1GB,1)}},
        @{N='Free(GB)';E={[math]::Round($_.Free/1GB,1)}},
        @{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} |
    Format-Table -AutoSize

Write-Host "`n=== TOP DIRECTORIES IN C:\Users\QuLeR ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 25 | Format-Table -AutoSize

Write-Host "`n=== CACHE / TEMP CANDIDATES ===" -ForegroundColor Cyan
$paths = @(
    'C:\Users\QuLeR\AppData\Local\Temp',
    'C:\Windows\Temp',
    'C:\Windows\SoftwareDistribution\Download',
    'C:\Users\QuLeR\AppData\Local\Microsoft\Windows\INetCache',
    'C:\Users\QuLeR\AppData\Local\npm-cache',
    'C:\Users\QuLeR\AppData\Roaming\npm-cache',
    'C:\Users\QuLeR\AppData\Local\pip\Cache',
    'C:\Users\QuLeR\.cache',
    'C:\Users\QuLeR\AppData\Local\Yarn\Cache',
    'C:\Users\QuLeR\AppData\Local\Microsoft\Edge\User Data\Default\Cache',
    'C:\Users\QuLeR\AppData\Local\Google\Chrome\User Data\Default\Cache',
    'C:\Users\QuLeR\.cargo\registry',
    'C:\Users\QuLeR\.rustup',
    'C:\Users\QuLeR\Downloads',
    'C:\Users\QuLeR\AppData\Local\pnpm-cache',
    'C:\Users\QuLeR\AppData\Local\Programs\Python',
    'C:\Users\QuLeR\AppData\Local\electron\Cache',
    'C:\Users\QuLeR\AppData\Local\electron-builder\Cache'
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $size = (Get-ChildItem $p -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1GB
        '{0,-78} {1,8:N2} GB' -f $p, $size
    } else {
        '{0,-78} (not found)' -f $p
    }
}

Write-Host "`n=== node_modules ACROSS C:\Users\QuLeR (top 20) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR' -Directory -Recurse -Filter 'node_modules' -Force -Depth 4 |
    ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
    } | Sort-Object SizeGB -Descending | Select-Object -First 20 | Format-Table -AutoSize

Write-Host "`n=== .next BUILD CACHES (top 20) ===" -ForegroundColor Cyan
Get-ChildItem 'C:\Users\QuLeR' -Directory -Recurse -Filter '.next' -Force -Depth 4 |
    ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
    } | Sort-Object SizeGB -Descending | Select-Object -First 20 | Format-Table -AutoSize

Write-Host "`n=== dist / out / build FOLDERS (top 20) ===" -ForegroundColor Cyan
$buildFolders = @()
foreach ($pattern in @('dist','out','build','release','target','.turbo','.vercel')) {
    $buildFolders += Get-ChildItem 'C:\Users\QuLeR' -Directory -Recurse -Filter $pattern -Force -Depth 4
}
$buildFolders | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 20 | Format-Table -AutoSize

Write-Host "`n=== RECYCLE BIN ===" -ForegroundColor Cyan
$recycle = (Get-ChildItem 'C:\$Recycle.Bin' -Recurse -Force | Measure-Object -Property Length -Sum).Sum / 1GB
'{0:N2} GB in recycle bin' -f $recycle

Write-Host "`n=== HIBERFIL / PAGEFILE ===" -ForegroundColor Cyan
Get-ChildItem 'C:\hiberfil.sys','C:\pagefile.sys','C:\swapfile.sys' -Force |
    Select-Object Name, @{N='SizeGB';E={[math]::Round($_.Length/1GB,2)}} |
    Format-Table -AutoSize
