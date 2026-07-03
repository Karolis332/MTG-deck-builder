$p = Get-Process -Id 27564 -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "PID 27564 still running. CPU=$($p.CPU), VM=$([math]::Round($p.VirtualMemorySize64/1MB,1))MB"
    Get-CimInstance Win32_Process -Filter "ProcessId = 27564" | Select-Object CommandLine | Format-List
} else {
    Write-Host "PID 27564 has exited."
}

# Also check diskpart
$dp = Get-Process diskpart -ErrorAction SilentlyContinue
if ($dp) {
    Write-Host "diskpart running: PID $($dp.Id), CPU=$($dp.CPU)"
} else {
    Write-Host "No diskpart process."
}
