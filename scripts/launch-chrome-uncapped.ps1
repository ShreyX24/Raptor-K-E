# Launches Chrome with VSync + frame-rate-limit disabled so r3f-perf can show
# the real frame rate the workstation's RTX 4090 + 4080 are capable of on the
# 3D scene. Without these flags, Chrome's requestAnimationFrame is gated by
# display refresh (60Hz on this workstation → 60 fps ceiling regardless of GPU).
#
# Tearing will be visible on a 60Hz panel — that is expected and a true
# stress-test view of the engine. Plug in a higher-refresh display to see the
# extra frames smoothly.
#
# Use a separate user-data-dir so this window does NOT collide with the
# chrome-devtools-mcp profile lock.

param(
  [string]$Url = 'http://localhost:3000'
)

$chromeExe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$profileDir = "$env:LOCALAPPDATA\raptor-tma-uncapped-profile"

if (-not (Test-Path $profileDir)) {
  New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

$flags = @(
  '--disable-frame-rate-limit'
  '--disable-gpu-vsync'
  '--enable-gpu-rasterization'
  '--enable-zero-copy'
  "--user-data-dir=$profileDir"
  '--new-window'
  $Url
)

Write-Host "Launching Chrome at $Url with VSync + frame-rate-limit disabled..."
Start-Process -FilePath $chromeExe -ArgumentList $flags
Write-Host "Done. Watch the r3f-perf overlay (bottom-left) — FPS should exceed 60."
