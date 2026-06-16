# Play one or more mp3 files sequentially and block until finished.
# Usage: powershell -File play_audio.ps1 -Path audio\s001_us-m.mp3 [-Path2 audio\s001_gb-f.mp3] [-GapSeconds 1]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Path2 = "",
    [string]$Path3 = "",
    [double]$GapSeconds = 0.8
)

Add-Type -AssemblyName presentationCore

function Play-One([string]$file) {
    $full = (Resolve-Path $file).Path
    $player = New-Object System.Windows.Media.MediaPlayer
    $player.Open([uri]$full)
    # wait for media to load so duration is known
    $tries = 0
    while (-not $player.NaturalDuration.HasTimeSpan -and $tries -lt 100) {
        Start-Sleep -Milliseconds 100
        $tries++
    }
    if (-not $player.NaturalDuration.HasTimeSpan) {
        Write-Error "could not load: $file"
        return
    }
    $secs = $player.NaturalDuration.TimeSpan.TotalSeconds
    $player.Play()
    Start-Sleep -Seconds ($secs + 0.3)
    $player.Close()
    Write-Output ("played {0} ({1:n1}s)" -f $file, $secs)
}

Play-One $Path
foreach ($p in @($Path2, $Path3)) {
    if ($p -ne "") {
        Start-Sleep -Seconds $GapSeconds
        Play-One $p
    }
}
