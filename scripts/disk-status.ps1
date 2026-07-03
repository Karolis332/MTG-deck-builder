$free = (Get-PSDrive C).Free / 1GB
$used = (Get-PSDrive C).Used / 1GB
Write-Host ('C: free = {0:N2} GB / used = {1:N2} GB' -f $free, $used)

$paths = @(
    'C:\Users\QuLeR\AppData\Local\Temp',
    'C:\Users\QuLeR\AppData\Local\NVIDIA\DXCache',
    'C:\Users\QuLeR\AppData\Local\NVIDIA\GLCache',
    'C:\Users\QuLeR\AppData\Local\NVIDIA\ComputeCache',
    'C:\Users\QuLeR\AppData\Roaming\stremio\stremio-server\stremio-cache',
    'C:\Users\QuLeR\AppData\Local\npm-cache',
    'C:\Users\QuLeR\AppData\Local\uv',
    'C:\Users\QuLeR\AppData\Local\pip\Cache'
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $sz = (Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        '{0,-72} {1,8:N2} GB' -f $p, $sz
    } else {
        '{0,-72} (not found)' -f $p
    }
}
