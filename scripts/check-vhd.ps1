$vhd = 'C:\Users\QuLeR\AppData\Local\Docker\wsl\disk\docker_data.vhdx'
if (Test-Path $vhd) {
    $s = (Get-Item $vhd).Length / 1GB
    Write-Host ('VHDx size: {0:N2} GB' -f $s)
}
$f = (Get-PSDrive C).Free / 1GB
Write-Host ('C: free = {0:N2} GB' -f $f)
