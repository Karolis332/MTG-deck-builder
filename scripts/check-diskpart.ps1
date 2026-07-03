Get-Process | Where-Object { $_.ProcessName -match 'diskpart|powershell' } |
    Select-Object Id, ProcessName, CPU, StartTime |
    Sort-Object StartTime -Descending |
    Format-Table -AutoSize
