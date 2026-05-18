# audit-perf.ps1 — grep src/ for known R3F perf anti-patterns
#
# Run from frontend repo root. Exits 1 if any anti-pattern found.
# Linux .sh parity will land when we cut over to Gaudi backend host.

$ErrorActionPreference = 'Stop'
$srcDir = Join-Path (Get-Location) 'src'
if (-not (Test-Path $srcDir)) {
    Write-Host 'Run from frontend repo root (./src not found)' -ForegroundColor Red
    exit 2
}

$violations = New-Object System.Collections.Generic.List[PSObject]

function Scan {
    param(
        [Parameter(Mandatory)] [string] $Pattern,
        [Parameter(Mandatory)] [string] $Message
    )
    $files = Get-ChildItem -Path $srcDir -Recurse -File -Include '*.ts','*.tsx','*.js','*.jsx','*.css'
    foreach ($f in $files) {
        $lines = Get-Content -LiteralPath $f.FullName
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match $Pattern) {
                $violations.Add([PSCustomObject]@{
                    File  = $f.FullName.Replace((Get-Location).Path + '\', '')
                    Line  = $i + 1
                    Match = $lines[$i].Trim()
                    Issue = $Message
                })
            }
        }
    }
}

# 1. Per-frame THREE allocations
Scan -Pattern 'new\s+THREE\.(Vector3|Vector2|Color|Matrix4|Quaternion|Box3)\(' `
     -Message 'Per-frame THREE alloc; hoist to module scope or useMemo'

# 2. drei <Instances> (warn — verify count manually)
Scan -Pattern '<Instances\b' `
     -Message 'drei <Instances> hits perf cliff above 100; consider raw THREE.InstancedMesh'

# 3. backdrop-filter blur > 8px over canvas
Scan -Pattern 'backdrop-filter[^;]*blur\((9|[1-9][0-9])px\)' `
     -Message 'backdrop-filter blur >8px tanks fps; use static rgba background instead'

# 4. OrbitControls
Scan -Pattern '\bOrbitControls\b' `
     -Message 'Use drei <CameraControls> (smoothing + fitToBox), not OrbitControls'

# 5. Bloom luminanceThreshold below 1
Scan -Pattern 'luminanceThreshold\s*=\s*\{?\s*(0(\.\d+)?|\.\d+)\b' `
     -Message 'Bloom luminanceThreshold must be >= 1.0 for selective bloom'

# 6. Banned fonts
Scan -Pattern "font[^;]*:[^;]*['""](Inter|Roboto|Arial|sans-serif)['""]" `
     -Message 'Use Geist + Geist Mono only; never Inter/Roboto/Arial/system'

# 7. setState inside useFrame (heuristic: setX call within useFrame callback)
Scan -Pattern 'useFrame\(\s*\([^)]*\)\s*=>\s*\{[^}]*set[A-Z]' `
     -Message 'Never call setState inside useFrame; mutate via refs and invalidate()'

# 8. MeshBasicMaterial (no PBR)
Scan -Pattern '<meshBasicMaterial\b' `
     -Message 'MeshBasicMaterial is flat; use meshStandardMaterial / meshPhysicalMaterial'

# 9. Missing outputColorSpace setup (heuristic: <Canvas without onCreated -> ColorManagement)
# Skipped — too hard to detect statically without false positives. Audit visually.

# 10. PNG/JPEG > 256 (we don't know size, but flag direct .png/.jpg imports for review)
Scan -Pattern "from\s+['""][^'""]+\.(png|jpe?g)['""]" `
     -Message 'Raw PNG/JPEG import — verify <256px or convert to KTX2 via toktx'

# 11. SSR / SSGI
Scan -Pattern '\b(SSR|SSGI)\b' `
     -Message 'realism-effects SSR/SSGI tanks perf for chip scene; skip'

# 12. Theatre.js Studio in non-dev (heuristic: studio import without DEV check)
Scan -Pattern "from\s+['""]@theatre/studio['""]" `
     -Message 'Verify @theatre/studio is gated behind import.meta.env.DEV'

if ($violations.Count -eq 0) {
    Write-Host '✓ No anti-patterns found' -ForegroundColor Green
    exit 0
}

Write-Host ('✗ Found {0} anti-pattern violation(s):' -f $violations.Count) -ForegroundColor Red
Write-Host ''
$violations | Format-Table File, Line, Issue -AutoSize
Write-Host ''
Write-Host 'Details:'
foreach ($v in $violations) {
    Write-Host ('  {0}:{1}  {2}' -f $v.File, $v.Line, $v.Match) -ForegroundColor Yellow
}
exit 1
