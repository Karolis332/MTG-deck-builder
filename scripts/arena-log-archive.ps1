# Copies MTG Arena's Player.log / Player-prev.log into the Grimoire data dir, one file per Arena
# session, so no game is lost when Arena rotates its log on the next launch. Idempotent: a session
# file is only rewritten when the live log has grown past it.
#
# Scheduled every 5 min by the "GrimoireArenaArchive" task (see docs in scripts/arena-game-report.ts).
# Session key = first "[UnityCrossThreadLogger]<date>" line, i.e. the Arena launch time.
# ponytail: no pruning or compression (~25 MB per session); add a gzip/age sweep if the dir passes a few GB.
# ponytail: two Arena relaunches inside one 5-min window lose the first session's tail; shorten the
# task interval if that ever matters.

$ErrorActionPreference = 'Stop'
$src = Join-Path $env:USERPROFILE 'AppData\LocalLow\Wizards Of The Coast\MTGA'
$dst = Join-Path $env:APPDATA 'the-black-grimoire\data\arena-logs'
New-Item -ItemType Directory -Force -Path $dst | Out-Null

function Open-Shared([string]$path) {
  # Arena keeps Player.log open for writing; open with ReadWrite sharing or the copy fails.
  [System.IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
}

function Get-SessionKey([string]$path) {
  $reader = New-Object System.IO.StreamReader (Open-Shared $path)
  try {
    for ($i = 0; $i -lt 5000 -and -not $reader.EndOfStream; $i++) {
      $line = $reader.ReadLine()
      if ($line -match '^\[UnityCrossThreadLogger\](\d[\d./: -]*\d{1,2}:\d{2}:\d{2}(?: ?[AP]M)?)') {
        $raw = $Matches[1].Trim()
        $t = [datetime]::MinValue
        # Arena writes the client's locale; US is the observed format, current culture the next guess.
        if ([datetime]::TryParseExact($raw, 'M/d/yyyy h:mm:ss tt', [Globalization.CultureInfo]::InvariantCulture, 'None', [ref]$t) -or
            [datetime]::TryParse($raw, [Globalization.CultureInfo]::CurrentCulture, 'None', [ref]$t)) {
          return $t.ToString('yyyyMMdd-HHmmss')
        }
        return ($raw -replace '[^0-9A-Za-z]+', '-')  # unparsed but still unique per launch
      }
    }
  } finally { $reader.Dispose() }
  return $null
}

foreach ($name in 'Player-prev.log', 'Player.log') {
  $path = Join-Path $src $name
  if (-not (Test-Path $path)) { continue }
  try {
    $key = Get-SessionKey $path
    if (-not $key) { continue }  # log too young to carry a timestamp yet
    $out = Join-Path $dst "session-$key.log"
    $len = (Get-Item $path).Length
    if ((Test-Path $out) -and (Get-Item $out).Length -ge $len) { continue }
    $in = Open-Shared $path
    try {
      $tmp = "$out.tmp"
      $fs = [System.IO.File]::Create($tmp)
      try { $in.CopyTo($fs) } finally { $fs.Dispose() }
    } finally { $in.Dispose() }
    Move-Item -Force $tmp $out
  } catch {
    Add-Content -Path (Join-Path $dst 'archive-errors.log') -Value "$(Get-Date -Format s) $name $($_.Exception.Message)"
  }
}
