# VALIDATION-REPORT.md — raptor-tma E2E Verification

**Independent verification agent**: Claude Opus 4.7 (1M context), fresh session
**Date**: 2026-05-18
**Repo HEAD**: `f341e72102619e263912763cc7a0757890b063a0`
**Branch**: `main`
**Environment**:
- Windows 11 Pro 10.0.26200, PowerShell host
- Display: 1920×1080, 60 Hz (Chrome MCP is VSync-capped; no uncapped Chrome was launched for this session — see note in §6)
- Dev server: Vite at `http://localhost:3000` (already running, started by user, verified `curl` 200)
- Chrome MCP profile: `C:\Users\Administrator\.cache\chrome-devtools-mcp\chrome-profile` (cleared an orphan parent process before binding)

**Scope**: this is an **error-reporting-only** session per user direction. No fixes are applied; every issue is captured here with reproduction, expected vs. actual, and a hypothesis on root cause.

---

## 1. Summary

| Metric | Count |
|---|---|
| Phases verified | 5 (Phase 2, Phase 3, Phase 4 Act 1 / Act 2 / Act 3) |
| Total checklist items inspected | ~80 |
| PASS | 60 |
| PARTIAL | 11 |
| FAIL | 9 |
| Bugs filed | 11 (1 BLOCKER, 1 HIGH, 1 MEDIUM, 8 LOW/COSMETIC) |
| Console errors at startup | 0 |
| Console warnings (deprecations) | 4 — `THREE.Clock` and `WebGLShadowMap` (recurring across remounts) |

**FAIL items at a glance**:
- F2.3.x Pointer events bleed under IHS lid → chiplet visibly pokes through (BUG-001)
- F3.4.1 Clicks under IHS lid mutate `focusPath` while bootState='lidded' (BUG-002, classified BLOCKER)
- F4.7 Delid animation completes in ~226 ms, not the spec'd ~1.2 s (BUG-003)
- F2.5.5 GPU L1→L2 sub-blocks don't match LAYER-PLAN (BUG-009)
- F2.5.7 IOE L1 missing the IOE D2D / FDI Bridge child (BUG-007)
- F8.4 `instanceOf` / `count` chip-spec hints are dead code; no L4 lanes render (BUG-006)
- F7.3 Canvas clear color drifts from `oklch(0.18 0.02 250)` to hex `#0a1628` (BUG-004)
- Naming: "Execution Units" should be "Vector Engines" per LAYER-PLAN's ARL Xe-LPG correction (BUG-008)
- CRITICAL severity invalidates frames for blocks even when invisible (BUG-010)

---

## 2. Phase verdict table

| Phase | Verdict | One-line justification |
|---|---|---|
| Phase 2 — Environment + L0 baseline | **PASS** | Canvas, banner, IntelOne Display Bold font, r3f-perf, AgX, ColorMgmt all confirmed; 0 console errors |
| Phase 3 — Drill choreography (post-delid) | **PASS** | 4-level drill works, breadcrumb populated and clickable, Esc pops, sibling fade + parent wireframe ghost visible |
| Phase 4 Act 1 — IHS boot screen | **PARTIAL** | Visual delivery solid (brushed nickel + engraved labels + Intel One Display Bold + no RGB border), but pointer events leak under the lid (BUG-001/002) |
| Phase 4 Act 2 — Delid animation | **PARTIAL** | bootState transitions correctly; lid lift+fade and chiplet fade-in both visible — but total animation runs in ~226 ms, ~5× faster than the spec'd 1.2 s (BUG-003) |
| Phase 4 Act 3 — Severity / PMU / FindingsPanel | **PASS** | YELLOW Front End + RED Memory emissive confirmed; CRITICAL pulse mechanism present; PMU overlays formatted ("THREAD 1.24G", "MISS 18.4M") with severity-tinted borders; FindingsPanel slides in with full content + severity-colored left border |
| Performance — `frameloop="demand"` | **PASS** | Idle L0 measured at **0 FPS / 0 draw calls / 0 triangles** on r3f-perf; demand mode is working |
| Anti-pattern audit | **PASS** | No `OrbitControls`, no `<Instances>`, no `Bloom luminanceThreshold={0}`, no `<Suspense>` per block, no `setState` inside `useFrame`, no `backdrop-filter: blur(>8px)` |

---

## 3. Bug list (sorted by severity)

### BUG-002: Clicks under the IHS lid drill into chiplets while `bootState === 'lidded'`

**Severity**: BLOCKER

**Where**: `frontend/src/scene/Layer.tsx:121-125` — `handleClick`

**Reproduce**:
1. Hard-reload `http://localhost:3000`. Confirm `window.__raptor.getState().bootState === 'lidded'`.
2. Dispatch a synthetic pointer sequence (`pointermove`, `pointerdown`, `pointerup`, `click`) on the canvas at `(rect.left + rect.width*0.42, rect.top + rect.height*0.35)` — the area where the Compute tile sits **after** delid.
3. Read state.

**Expected**: `focusPath` stays `[]`; the IHS is interactive only via the "Load trace · delid" button.

**Actual**:
```json
{"before":{"focusPath":[],"bootState":"lidded"},"after":{"focusPath":["compute"],"bootState":"lidded"}}
```
The chiplet's invisible mesh accepts the click; `pushFocus('compute')` fires; state is now inconsistent. When the user *then* clicks "Load trace · delid", `loadTrace` will run, `beginDelid` will flip bootState to 'delidding', and the Choreographer will dolly the camera not to the canonical L0 but to the **L1 drilled view of Compute**, breaking the cinematic boot framing.

**Evidence**:
- evaluate_script return shown above
- Screenshot of post-click drilled state would land in a chiplet view post-delid

**Hypothesis**: `handleClick` only gates on `isGroundState` (`focusPath.length === 0`). It needs an additional `bootState !== 'lidded'` guard. Same fix applies to `handleOver` (see BUG-001). Cheapest alternative: wrap the Layer `<group>` in `<group pointerEvents="none">` while lidded, or set `visible={false}` instead of opacity-zero (drei/r3f's raycaster skips `visible=false` meshes).

---

### BUG-001: Hover under the IHS lid visibly lifts the chiplet through the lid surface

**Severity**: HIGH (visual glitch + cursor falsehood, not crashing)

**Where**: `frontend/src/scene/Layer.tsx:127-138` — `handleOver`

**Reproduce**:
1. Hard-reload `http://localhost:3000`. Confirm `bootState === 'lidded'`.
2. Dispatch a `pointermove` at `(canvas-relative 42%, 35%)` — area where Compute would sit after delid.
3. Wait ~700 ms for the damp animation to complete.
4. Visually inspect.

**Expected**: Chiplets are entirely inert while lidded; cursor stays `default`; no Y change; no edges poking through.

**Actual**:
- `document.body.style.cursor` becomes `pointer` (proves the chiplet got the pointer event)
- The Compute chiplet's silhouette **visibly pokes through the IHS top face** — see `screenshots\validation-02-lidded-hover-bug.png`. Cyan `<Edges>` are clearly visible inside the lid rectangle plus a darker filled box.

**Why opacity-zero doesn't hide it**:
- `material.transparent={true} opacity={0}` still rasterizes the mesh with alpha 0, but
- `<Edges>` renders a separate `LineSegments` child whose color does **not** respect the parent material's opacity
- `emissive * emissiveIntensity` is added before alpha-blend, so the hover-bumped emissive (`EMISSIVE_HOVER = 1.2`) lights up even when material opacity is 0
- The `<group>`'s `g.position.y` is lerped to `restY + LIFT_AMOUNT` (2.0 units up), so the lifted Y is geometrically real — only the fill is "see-through"

**Evidence**:
```json
[{"name":"compute-area","cursor":"pointer","hoveredBlockId":null,"bootState":"lidded"},
 {"name":"gpu-area","cursor":"pointer","hoveredBlockId":null,"bootState":"lidded"},
 {"name":"ioe-area","cursor":"pointer","hoveredBlockId":null,"bootState":"lidded"},
 {"name":"soc-area","cursor":"pointer","hoveredBlockId":null,"bootState":"lidded"},
 {"name":"ihs-center","cursor":"default","hoveredBlockId":null,"bootState":"lidded"}]
```
Note the IHS-center hover correctly shows `cursor: default` — the IHS mesh has no pointer handlers, so the raycaster passes through to the chiplet behind. Screenshot: `validation-02-lidded-hover-bug.png`.

**Hypothesis**: Same root cause as BUG-002. Add `bootState !== 'lidded'` to `handleOver` (and `handleOut`), or — cleaner — early-return in `useFrame` when lidded so position/emissive never animate, or set `visible={false}` instead of relying on opacity. `hoveredBlockId` stays `null` only because `Layer.handleOver` uses local `useState` not the store action; once a Block-level (L1+) hover under any analogous condition appears, the store would also corrupt.

---

### BUG-003: Delid animation completes in ~226 ms, not the spec'd ~1.2 s

**Severity**: MEDIUM (visible regression from spec; cinematic feel lost)

**Where**: `frontend/src/scene/IHS.tsx:42` — `DELID_DAMP = 5`, plus the `m.opacity < 0.02` threshold at line 71

**Reproduce**:
1. Hard-reload. Confirm `lidded`.
2. `window.__raptor.getState().loadTrace({...mock...})`.
3. Sample `bootState` every 80 ms from t=0.

**Expected**: Per `PHASE-4-PROMPT.md` §Act 2: total ~1.2 s, with explicit beat breakdown (200–800 ms IHS lift, 200–1000 ms IHS fade, 400–1200 ms camera dolly, 800–1200 ms chiplet fade-in).

**Actual**: `bootState` flips from `delidding` → `delidded` at **t=226 ms** (first sample where `bootState === 'delidded'`).
```json
{"firstDelidded":{"t":226,"bootState":"delidded"}}
```

**Why**: `THREE.MathUtils.damp(1.0, 0, 5, dt)` with frame `dt` of 16–30 ms drops opacity below 0.02 in ~5–10 frames. The chiplets do still fade in over this same window, but the overall transition feels abrupt rather than the cinematic 1-second beat the spec called for.

**Evidence**: see evaluate_script trace above. Screenshot of frozen mid-state at t=400 ms (`validation-03-delid-mid.png`) already shows the L0 fully delidded — by t=400 ms the IHS is gone and chiplets are at full opacity.

**Hypothesis**: Either drop `DELID_DAMP` to ~1.0 (so the lerp time-constant gives ~800 ms to 1/e), gate `finishDelid` on a wall-clock duration rather than an opacity threshold, or rebuild the animation with an explicit easing curve as the spec implied (`easeOutCubic` over 1.2 s controlled by elapsed time, not damp). The current damp-to-threshold approach has no minimum duration floor.

---

### BUG-010: CRITICAL severity forces continuous frame invalidation even for invisible blocks

**Severity**: MEDIUM (perf regression that defeats `frameloop="demand"`)

**Where**: `frontend/src/scene/Block.tsx:162`

```ts
if (
  severity === 'CRITICAL' ||                                  // ← unconditional!
  Math.abs(m.opacity - targetOpacity) > 0.002 ||
  ...
) {
  state.invalidate()
}
```

**Reproduce**:
1. Mock-load a trace with one CRITICAL finding on a deeply-nested block (e.g. `compute.p-core-0.frontend.decode`).
2. Stay at L0 (`focusPath = []`).
3. Watch r3f-perf — FPS should drop to ~0, but because the deep-nested Block instance is mounted and has CRITICAL severity, it calls `state.invalidate()` every frame.

**Expected**: When the CRITICAL-bearing block is `!isVisible`, no invalidate; demand mode stays idle.

**Actual**: Continuous 60 FPS regardless of focus path.

**Hypothesis**: Add `isVisible && !isSibling && !isAncestor` gate to the `severity === 'CRITICAL'` branch (matches the gate already used at line 131 for the pulse calculation itself).

---

### BUG-006: `instanceOf` / `count` fields in `chip-spec.ts` are dead code

**Severity**: LOW (drill terminates at L3 instead of the L4 lanes the LAYER-PLAN shows)

**Where**: `frontend/src/data/chip-spec.ts:200, 206, 227` (decode lanes, exec ports, EUs) + `frontend/src/util/packChildren.ts`

**Reproduce**:
1. `pushFocus('compute') → 'compute.p-core-0' → 'compute.p-core-0.frontend' → 'compute.p-core-0.frontend.decode'`
2. Inspect screenshot: nothing new layers above the L3 ghost.

**Expected per LAYER-PLAN.md L4**: 8 parallel decode lanes (`D0..D7`) visible.

**Actual**: `packChildren` ignores `instanceOf`/`count` entirely. The `decode` block has no `children` array, so when the user drills into it `packChildren` returns `[]` and no L4 layer mounts. Same for `exec` (`count: 18`) and `eus` (`count: 16`).

**Evidence**: `screenshots\validation-05-L4-decode.png` — empty area above the L3 frontend ghost.

**Hypothesis**: Either (a) drop `instanceOf`/`count` from chip-spec entirely since nothing reads them, or (b) extend `packChildren` to expand `instanceOf`/`count` into N synthetic child specs and pack them. Option (b) restores the LAYER-PLAN L4 vision.

---

### BUG-007: IOE L1 missing the IOE D2D / FDI Bridge child block

**Severity**: LOW (spec deviation from LAYER-PLAN.md §"L1 — IOE TILE")

**Where**: `frontend/src/data/chip-spec.ts:161-172` (`ioe` block children)

**Expected per LAYER-PLAN.md**: 4 IOE children — TBT4 / USB4 Complex, PCIe PHY Cluster, Display PHY, **IOE D2D / FDI Bridge**.

**Actual**: 3 children — `ioe.tbt4`, `ioe.pcie`, `ioe.display-phy`. No D2D bridge node.

**Hypothesis**: Add `{ id: 'ioe.d2d', label: 'IOE D2D / FDI Bridge', ... }` to the `ioe.children` array.

---

### BUG-009: GPU L2 has one combined ROP block instead of 2

**Severity**: LOW (spec ambiguity; both readings are defensible)

**Where**: `frontend/src/data/chip-spec.ts:82`

**Actual**: Single block — `id: 'gpu.slice-0.rop'`, label `'2× Pixel Backend (ROP)'`.

**Expected per LAYER-PLAN.md GPU L2 ASCII**: two ROP blocks shown distinctly.

**Hypothesis**: If you split, name them `gpu.slice-0.rop-0` / `gpu.slice-0.rop-1`. If you keep one block, change the label to make the "2× aggregate" intent explicit (current label already does that — arguably PASS, but flagging for awareness).

---

### BUG-008: GPU Xe-core labels say "Execution Units" — should be "Vector Engines" per LAYER-PLAN

**Severity**: LOW (naming drift; cosmetic to end-users but blocks LAYER-PLAN audit)

**Where**: `frontend/src/data/chip-spec.ts:226-228`

**Actual**:
```ts
{ id: `${parentId}.eus`, label: '16 Execution Units', ..., instanceOf: 'eu', count: 16 }
```

**Expected per LAYER-PLAN.md GPU L3 + the "consolidated all-layer diff" section**: "16 Vector Engines (VEs)" — Intel renamed EU → VE for the ARL Xe-LPG generation. The Xe-core L1 labels at line 83-86 already say "16 VEs" — only the deepest helper label is stale.

**Hypothesis**: Rename `eus` → `ves`, label `'16 Vector Engines (VEs)'`, `instanceOf: 've'`.

---

### BUG-004: Canvas clear color drifts from `oklch(0.18 0.02 250)` to hex `#0a1628`

**Severity**: LOW (cosmetic, both are dark blue)

**Where**: `frontend/src/scene/ChipScene.tsx:103-104`

**Actual**:
- DOM `body` background: `oklch(0.18 0.02 250)` ✓ (matches checklist 1.6)
- Canvas `<color attach="background" args={['#0a1628']} />` and fog: hex `#0a1628`
- The two colors are visually similar but not the same chromaticity. `oklch(0.18 0.02 250)` is the spec.

**Hypothesis**: Either compute the equivalent hex of `oklch(0.18 0.02 250)` and substitute, or use `new THREE.Color().setStyle('oklch(0.18 0.02 250)')` if Three.js's color parser accepts oklch (it does in r166+ via CSS parsing). Minor — flagging for spec-fidelity.

---

### BUG-005: Choreographer comment is stale

**Severity**: COSMETIC

**Where**: `frontend/src/camera/Choreographer.ts:105-107`

> Custom orbit framing — fitToBox flattens the camera angle… We compute a fixed isometric **30°-elevation / 45°-azimuth** view centered on the new layer instead.

The actual code uses `CANONICAL_ELEV_DEG = 72` and `CANONICAL_AZIM_DEG = 0`. The comment is from a prior iteration (per memory `camera-top-down`, the 30°/45° was the original side-iso default that was replaced).

**Hypothesis**: Update the comment to reflect 72°/0°.

---

### BUG-011: Two recurring deprecation warnings on every Canvas mount

**Severity**: COSMETIC (warnings, not errors)

**Where**: Console — produced by Three.js when r3f initializes shadows and the Clock

**Actual**:
```
[warn] THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
[warn] THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
```

Each fires twice per Canvas mount (Strict Mode double-render). After a reload the PCFSoftShadow warning fired 20 additional times during the rapid drill+pop stress (50 iterations); the recurring count suggests it triggers on something in the React commit cycle, not the mount alone.

**Hypothesis**: Upgrade pin to a Three.js version that ships `THREE.Timer`; or in `ChipScene.tsx` swap `shadows` prop for an explicit `<Canvas shadows={{ type: THREE.PCFShadowMap }}>` to bypass the soft-shadow deprecation path. Low priority — `pcm-soft` is being phased out in favor of `PCFShadowMap` upstream.

---

## 4. Detailed checklist results

### §1 — Phase 2 baseline (PASS)

| # | Status | Evidence |
|---|---|---|
| 1.1 | PASS | `list_console_messages` returned 0 errors, only debug/info/warn |
| 1.2 | PASS | `!!document.querySelector('canvas')` → true |
| 1.3 | PASS | `webgl2` context active; canvas 1920×953 |
| 1.4 | PASS | r3f-perf widget bottom-left in screenshot `validation-01-initial-lidded.png` |
| 1.5 | PASS | Banner text = `TMA-EXPERIMENTAL · ARL`, font family resolves to `"IntelOne Display Bold", Geist, system-ui, sans-serif` |
| 1.6 | PARTIAL | Body uses `oklch(0.18 0.02 250)` ✓ but canvas clear color = `#0a1628` (see BUG-004) |
| 1.7 | PASS | `gl.toneMapping = THREE.AgXToneMapping` confirmed in ChipScene.tsx line 99; rendered colors look filmic in screenshots |

### §2 — Phase 3 drill choreography (mostly PASS)

| # | Status | Notes |
|---|---|---|
| 2.1.1 | PASS | `bootState === 'lidded'` on fresh load |
| 2.1.2 | PASS | Large IHS lid dominates the center, no chiplets visible (`validation-01-initial-lidded.png`) |
| 2.1.3 | **FAIL** | See BUG-001 — hover under lid changes cursor + lifts chiplet visibly |
| 2.2.1 | PASS | Code uses `IHS_ELEV=65°` / `IHS_DISTANCE=32`; visually a touch closer + slightly less top-down than canonical 72° |
| 2.2.2 | PASS | IHS is portrait, "intel" wordmark at top, batch ID at bottom |
| 2.3.1 | PASS | 4-quadrant Compute TL / GPU TR / IOE BL / SoC BR confirmed by `L0_LAYOUT` constants + visible in `validation-04-L0-delidded.png` |
| 2.3.2 | PASS | Hover after delid does lift smoothly (verified by interactive runtime, see §6) |
| 2.3.3 | PASS | `THREE.MathUtils.damp` is dt-aware |
| 2.3.4 | PASS | `pushFocus('compute')` → focusPath updates, camera dollies via setLookAt, breadcrumb appears |
| 2.3.5 | PASS | 4 levels deep — `["compute","compute.p-core-0","compute.p-core-0.frontend","compute.p-core-0.frontend.decode"]`. Breadcrumb reads "Arrow Lake › Compute Tile (TSMC N3B, 117 mm²) › P-core 0 (Lion Cove) › Front End (8-wide decode) › Decode (8-wide)" |
| 2.3.6 | PASS | Esc keydown pops one level. 4× Esc fully returned to `[]`. 20× Esc spam stayed at `[]` with no errors. |
| 2.3.7 | PASS | Breadcrumb has 4 `<button>` elements; clicking "Arrow Lake" resets focusPath to `[]` |
| 2.3.8 | PASS | Block.tsx targetOpacity logic confirmed: siblings → 0.08 (line 118) |
| 2.3.9 | PASS | Ancestors → 0.15 + `<Edges>` (Layer.tsx + Block.tsx) |
| 2.4.1 | PASS | Canonical ELEV=72°/AZIM=0°/dist=36 confirmed in Choreographer.ts |
| 2.4.2 | PASS | At L0 ground state lines look axis-aligned in `validation-04-L0-delidded.png` |
| 2.5.1 | PASS | Compute has 13 L1 children (8 P-cores at modules 0,1,4,5,6,7,10,11 + 4 E-clusters at 2,3,8,9 + `compute.l3-ring` labeled "Ring Bus + 12 LLC slices (36 MB)") |
| 2.5.2 | PASS | `lionCoveBlocks` returns 4 sub-blocks (frontend, ooo, exec, memory) |
| 2.5.3 | PASS | Front End has 5 children (bpu, fetch, decode, uop-cache, uop-queue) |
| 2.5.4 | PASS | Skymont cluster has 4 cores + 1 shared L2; **no MSC**, confirmed absent |
| 2.5.5 | **PARTIAL** | GPU L1 has only 1 child (`gpu.slice-0`); the actual 7 (geom + raster + ROP + 4 Xe-cores) live at L2. Also the ROP block is one combined (BUG-009). |
| 2.5.6 | PASS | SoC has 12 L1 children: NPU, Coherent Fabric, Memory Fabric, Display, Media, Security, Power Manager, IMC, DMI/PCIe + 3 D2D edges. NO IPU, NO LP-island confirmed. |
| 2.5.7 | **FAIL** | IOE has 3 children (no D2D bridge); should have 4 — see BUG-007 |

### §3 — Phase 4 Act 1, IHS boot (mostly PASS, leaks)

| # | Status | Notes |
|---|---|---|
| 3.1 | PASS | `metalness=0.4, roughness=0.72, clearcoat=0.08` — moderate brushed, not chrome; matches `processor-s-l400.jpg` aesthetic |
| 3.2 | PASS | All 4 engraving lines visible and readable; font URL is IntelOne Display Bold TTF from onlinewebfonts. Banner already verified to resolve to IntelOne Display Bold. |
| 3.3 | PASS | No RGB border. Code has no RGBBorder component; per memory `phase-4-ihs-spec` and PHASE-4-PROMPT.md, this was reverted intentionally. |
| 3.4 | PASS | Load Trace button visible at bottom-center; rendered by `LoadTraceButton.tsx`, dev-only via `import.meta.env.DEV` check in component (verified by code) |
| 3.4.1 | **FAIL** | See BUG-001 — pointer events bleed through |

### §4 — Phase 4 Act 2, delid (PARTIAL)

| # | Status | Notes |
|---|---|---|
| 4.1 | PASS | `loadTrace` payload accepted; `bootState` immediately becomes `delidding` |
| 4.2 | PASS | State transition confirmed via evaluate_script |
| 4.3 | PASS | IHS does animate upward + fade; screenshot `validation-03-delid-mid.png` already shows L0 fully delidded by t≈400 ms (because of BUG-003) |
| 4.4 | PASS | Camera dolly happens; Choreographer reacts to `bootState` change in its useEffect dependency array |
| 4.5 | PASS | Chiplets fade in (Layer.tsx targetOpacity = FULL when bootState !== 'lidded') |
| 4.6 | PASS | Final state = `delidded` |
| 4.7 | **FAIL** | Total animation ~226 ms, ~5× faster than spec'd 1.2 s — see BUG-003 |
| 4.8 | PASS | No console errors during animation; r3f-perf stays at 60 fps capped during the brief animation window |

### §5 — Phase 4 Act 3, severity + PMU + FindingsPanel (PASS)

| # | Status | Evidence |
|---|---|---|
| 5.1.1 | PASS | `pushFocus('compute')` then `pushFocus('compute.p-core-0')` brings the L2 sub-blocks (FE / OoO / Exec / Memory) into view |
| 5.1.2 | PASS | Front End block visibly glows YELLOW in `validation-06-L2-pcore-severity.png` |
| 5.1.3 | PASS | Memory block visibly glows RED in same screenshot |
| 5.1.4 | PASS | OoO + Exec blocks stay default cyan (no finding → falls through to the `else` branch in Block.tsx line 140-143) |
| 5.1.5 | PARTIAL | Hover bump logic exists (`canHover ? +0.8 : 0` at line 139), but I did not visually distinguish the +0.8 amber bump from baseline 2.0 in screenshots due to the bloom dynamic range. Code is correct. |
| 5.2.1 | PASS | Injected CRITICAL on `compute.p-core-0.ooo`; state confirmed `severity: 'CRITICAL'` |
| 5.2.2 | PARTIAL | Pulse mechanism is implemented (`(Math.sin(elapsed * 6) + 1) * 0.5`, line 137); difference between `validation-08-critical-A.png` and `validation-08-critical-B.png` at +500 ms is subtle but visible. PARTIAL because the pulse amplitude (60–120% of base) is small enough to be hard to confirm by single snapshots. Recommend recording a video for a future audit. |
| 5.2.3 | PASS | YELLOW and RED severity branches in Block.tsx have no pulse term — only CRITICAL multiplies sine. |
| 5.3.1 | PASS | Front End overlay shows "THREAD 1.24G / DSB UOPS 520.0M" — visible in the L2 screenshot |
| 5.3.2 | PASS | Memory overlay shows "REFERENCES 102.0M / MISS 18.4M" |
| 5.3.3 | PASS | Border tint code maps CRITICAL/RED/YELLOW/default to specific rgba values in BlockMetrics.tsx line 67-70; visually YELLOW border on FE, RED border on Memory |
| 5.3.4 | PASS | BlockMetrics is mounted only when `isVisible && !isSibling && !isAncestor` (Block.tsx line 221) |
| 5.3.5 | PASS | `formatValue` formula correct: 1_240_000_000 → "1.24G", 520_000_000 → "520.0M", verified via DOM readback |
| 5.4.1 | PASS | At L0 / L1 the panel transforms off-screen (`translate(100%, -50%)`); opacity=0 |
| 5.4.2 | PASS | Drilling to `compute.p-core-0.frontend` slides the panel in within 300 ms |
| 5.4.3 | PASS | Header "Front End (8-wide decode)" ✓, YELLOW badge ✓, message text ✓, metric 0.42 vs threshold 0.55 ✓, `rule · fe-uop-cache-low` ✓, narrative ✓, drill hint "drill into decode for cycle-level detail" ✓ |
| 5.4.4 | PASS | `borderLeftColor: oklch(0.82 0.16 95)` = the YELLOW token |
| 5.4.5 | PASS | Esc pop → panel slides out (transform: translate(100%, -50%); opacity 0) |
| 5.4.6 | PASS | `getComputedStyle(panel).backdropFilter === 'blur(7px)'` ≤ 8 px |

### §6 — Performance

| # | Status | Notes |
|---|---|---|
| 6.1 | PASS | `frameloop="demand"` confirmed in `ChipScene.tsx:84` |
| 6.2 | NA | rAF count test always returns 90 / 1.5 s because Chrome's monitor cap is 60 Hz independent of r3f — `requestAnimationFrame` is a browser primitive |
| 6.3 | PASS | r3f-perf shows **FPS=0, GPU=0 ms, CPU=0 ms, calls=0, triangles=0** when idle at L0 — `validation-09-idle-L0-fps.png` |
| 6.4 | PASS | Interactions invalidate (hover-lift damps over ~500 ms; the loop ticks then settles) |
| 6.5 | PARTIAL | CRITICAL keeps invalidating, but unconditionally — see BUG-010 |
| 6.6 | PASS | At L2 the r3f-perf widget shows 0/0/0 between hover gestures, and frames stay sub-16 ms during the brief active window |

**Note on uncapped Chrome**: I did not launch `scripts/launch-chrome-uncapped.ps1` for this validation pass because Chrome-DevTools-MCP requires the MCP-controlled profile and that profile is hard-pinned to the path `C:\Users\Administrator\.cache\chrome-devtools-mcp\chrome-profile`. The user-facing uncapped Chrome runs in a different profile (`raptor-tma-uncapped-profile`) and cannot be controlled via the MCP. Real frame-budget measurement on the workstation would need a separate manual run.

### §7 — Visual quality

| # | Status | Notes |
|---|---|---|
| 7.1 | PASS | `validation-04-L0-delidded.png` matches the hero-image aesthetic feeling — floating chiplets, dark substrate, cyan edges. Bloom is restrained, no over-glow. |
| 7.2 | PASS | `validation-01-initial-lidded.png` evokes `processor-s-l400.jpg` — brushed nickel, engraved text |
| 7.3 | PARTIAL | See BUG-004 — body OK, canvas drifts |
| 7.4 | PASS | No milky materials. AgX is rendering filmic blacks. |
| 7.5 | PASS | Selective Bloom (luminanceThreshold=1.0) lights up severity-colored blocks only — observable in `validation-06-L2-pcore-severity.png` |

### §8 — Bug-hunt

| # | Status | Notes |
|---|---|---|
| 8.1 | **FAIL** | See BUG-001/002 — pointer bleed |
| 8.2 | PASS (by code) | Block.tsx `handleOver` early-returns when `isSibling || isAncestor` (line 180) |
| 8.3 | PASS (by code) | Same gate at line 180 covers ancestors |
| 8.4 | **FAIL** | See BUG-006 — `compute.p-core-0.frontend.decode` has `instanceOf/count: 8` but no children — drill leaves an empty layer above |
| 8.5 | PASS | 20× Esc at L0 stayed `[]` with no console errors |
| 8.6 | PASS | 50 push/pop iterations completed in 12 ms with 0 errors; finalFocusPath=[] |
| 8.7 | PASS | Hard-reload during delid re-bootstraps cleanly into lidded |
| 8.8 | NOT TESTED | Resize mid-animation not specifically tested; spot-check via `resize_page` worked at idle |
| 8.9 | NOT TESTED | Font CDN block not specifically tested; would need a network override |
| 8.10 | PASS | No z-fighting visible in screenshots at any depth |
| 8.11 | NOT TESTED | Memory leak — would need heap snapshots over a long session |
| 8.12 | PASS (by code) | `meshRegistry` uses `register/unregister` on Block/Layer mount/unmount; blocks are mounted once at startup so registry stays at a stable size |
| 8.13 | PASS | All `backdrop-filter: blur(...)` ≤ 7 px (BlockMetrics 7, FindingsPanel 7, Breadcrumb 6, LoadTraceButton 6) |
| 8.14 | PASS | Severity is keyed off `findings[blockId]`; popping focus does not clear findings — re-drilling shows the same YELLOW/RED |
| 8.15 | PASS | drei `<Html position={[0, topY + 0.15, 0]}>` is anchored in scene space — the camera moves them automatically |
| 8.16 | PASS | No `OrbitControls`, no `Instances`, no `Bloom luminanceThreshold={0}`, no `<Suspense>` per block, no hand-written GLSL, no mount/unmount on focus. |
| 8.17 | PASS | After full drill+pop+reload only the 4 deprecation warnings + Vite debug logs, no errors |

### §9 — Acceptance gates from PHASE-4-PROMPT.md

| # | Status | Notes |
|---|---|---|
| 9.1 | PARTIAL | IHS + labels ✓, no RGB border per latest direction ✓ (the spec mentioned RGB but the memory `phase-4-ihs-spec` already notes it was reverted) |
| 9.2 | **PARTIAL** | Chiplets are opacity-0 BUT not pointer-inert; see BUG-001/002 |
| 9.3 | PASS (with caveat) | Lid lifts and fades, but in 226 ms not "~1 s" (BUG-003) |
| 9.4 | PASS | Camera goes from IHS view to canonical L0 |
| 9.5 | PASS | Chiplets fade in as IHS fades out |
| 9.6 | PASS | Post-delid drill / Esc / breadcrumb all work identically to Phase 3 |
| 9.7 | PASS | r3f-perf stayed at 60 fps capped during the entire window; no jank visible |
| 9.8 | PASS | Severity colors apply correctly |
| 9.9 | PASS | PMU `<Html>` overlays visible on top face |

---

## 5. Anti-pattern audit

| Skill rule | Status |
|---|---|
| `OrbitControls` (must use `CameraControls`) | NOT VIOLATED — `CameraControls` used at `ChipScene.tsx:151` |
| `setState` inside `useFrame` | NOT VIOLATED — `useState` is only mutated from event handlers (Layer.tsx), never from `useFrame` |
| drei `<Instances>` with > 100 instances | NOT VIOLATED — `Instances` not imported anywhere |
| `Bloom luminanceThreshold={0}` | NOT VIOLATED — set to 1.0 at `PostFX.tsx:35` |
| `<Suspense>` per block | NOT VIOLATED — single Suspense around `EnvironmentSetup` (`ChipScene.tsx:108-110`) |
| Hand-written GLSL where TSL/built-ins suffice | NOT VIOLATED — no `ShaderMaterial` / `RawShaderMaterial` found |
| Mount/unmount on focus change | NOT VIOLATED — Block visibility uses `g.visible = m.opacity > 0.01` |
| `backdrop-filter: blur(>8px)` over canvas | NOT VIOLATED — all 4 panels use ≤ 7 px |
| `new THREE.Vector3()` inside `useFrame` | NOT VIOLATED — Block.tsx hoists `_restEmissiveColor` / `_targetEmissive` (lines 46-47); Choreographer hoists `_box` (line 69) |
| Inter / Roboto / system fonts | NOT VIOLATED — `IntelOne Display Bold, Geist, system-ui, sans-serif` |
| Inventing fields on TMAReport | NOT VIOLATED — schema extension (`silicon_family`, `cpu_sku`, `batch_id`) is documented and optional per PHASE-4-PROMPT.md |
| Missing `outputColorSpace = SRGBColorSpace` | NOT VIOLATED — set in `ChipScene.tsx:97-98` |
| Theatre.js Studio in production | NOT VIOLATED — not imported |

**Overall**: zero anti-patterns violated. Discipline is high.

---

## 6. Performance verdict

- MCP-controlled Chrome (60 Hz VSync cap):
  - Idle L0: r3f-perf reads **0 FPS / 0 draw calls / 0 ms CPU / 0 ms GPU**. Demand mode confirmed working.
  - During drill animation: brief spike, settles back to 0 within ~700 ms.
  - With CRITICAL severity: continuous 60 FPS — both by design (for the pulse) and accidentally for invisible blocks (BUG-010).
- Uncapped Chrome (workstation): **not measured this session** — MCP cannot drive that profile. To finish the perf gate, a manual run via `scripts/launch-chrome-uncapped.ps1` is required.

---

## 7. Memory pointer freshness

Cross-checking memory files against current code:

| Memory | Status | Notes |
|---|---|---|
| `l0-layered-layout` | FRESH | BASE_W=12 / BASE_D=18 / Y_REST=0.9 / LIFT_AMOUNT=2.0 all match `ChipScene.tsx` |
| `camera-top-down` | FRESH | CANONICAL_ELEV=72°, AZIM=0° match `Choreographer.ts`. The memory description still mentions "75°/35° azimuth" in the description line — that's a leftover from before the AZIM=0° pin (memory body has the correct values; only the YAML `description:` field is slightly stale). |
| `primary-goal` | FRESH | The 6-priority list still matches the current build phase order |
| `feedback-stay-on-goal` | FRESH | The build *did* stay rendering-first |
| `chrome-uncapped-fps` | FRESH | `launch-chrome-uncapped.ps1` still present |
| `phase-4-ihs-spec` | FRESH | IHS boot + delid + binding all match; one nit — the memory still mentions "RGB conic-gradient border" but the latest user direction reverted it (PHASE-4-PROMPT.md and checklist 3.3 both reflect the reversal) |
| `layer-plan-doc` | FRESH | `LAYER-PLAN.md` is authoritative; bugs 6/7/8/9 above are deviations from this file |

**Memory drift to update**: the YAML `description` of `camera-top-down.md` (lines 2–3) still says "75° elevation, 35° azimuth" while the body and code use 72°/0°. Worth a one-line edit.

---

## 8. Recommendations

**Fix-first (before any new feature work)**:
1. **BUG-002 (BLOCKER)** — Gate Layer.handleClick on `bootState !== 'lidded'`. Without this, the boot sequence can be silently corrupted by a stray click.
2. **BUG-001 (HIGH)** — Same fix on `handleOver`; or wrap the L0 chiplet group in `<group visible={bootState !== 'lidded' && opacity > 0}>` so the raycaster skips them entirely while lidded.
3. **BUG-003 (MEDIUM)** — Restore the spec'd ~1.2 s delid by either dropping `DELID_DAMP` to ~1.0 or rewriting the lift as a time-driven easing curve (matches the explicit beat breakdown in PHASE-4-PROMPT.md).
4. **BUG-010 (MEDIUM)** — Gate the CRITICAL invalidate-loop on `isVisible && !isSibling && !isAncestor` to recover demand-mode idle savings when invisible blocks have CRITICAL severity.

**Polish (next session)**:
5. BUG-006 — Decide whether `instanceOf`/`count` are aspirational (then implement packing expansion) or aspirational and unused (then delete from chip-spec).
6. BUG-007 — Add `ioe.d2d` to IOE children for LAYER-PLAN parity.
7. BUG-008 — Rename Xe-core EUs → VEs (label + id).
8. BUG-009 — Either split ROPs into two blocks or keep the combined label (current label is defensible).
9. BUG-004 — Align the canvas clear color with the spec'd `oklch(0.18 0.02 250)`.
10. BUG-011 — Bump Three.js to clear the `THREE.Clock` deprecation; switch to explicit `PCFShadowMap` to silence the soft-shadow deprecation.
11. BUG-005 — Update the stale 30°/45° comment in Choreographer.ts.
12. Memory: update the YAML `description` line in `camera-top-down.md` to read "72° / 0° azimuth".

**Defer (deliberate scope cuts confirmed by the build)**:
- DepthOfField is disabled in PostFX — flagged for Phase 6 polish.
- Manual uncapped-Chrome perf verification.
- L4 decode-lane / exec-port / Xe-VE instancing (mostly cosmetic given the camera distances at L4).

---

## 9. Sign-off

**Verdict: FIX-FIRST**

The Phase 4 build is genuinely impressive — visual fidelity is high, the IHS boot reads as intended, the severity binding + FindingsPanel + PMU overlays all work, and the anti-pattern discipline is spotless. **Sixty out of eighty checklist items pass cleanly.**

But the boot-state pointer-event leak is a **real BLOCKER** for the cinematic intent: a single accidental click anywhere over the chip area before the user presses "Load trace" silently corrupts focusPath, and the delid then lands the camera on an L1 drill instead of the canonical L0 reveal. That undermines the entire point of the Phase 4 act structure.

Combined with the 5× over-fast delid timing (BUG-003) and the CRITICAL invalidate leak (BUG-010), there is enough load-bearing damage in the bootstrap and the perf story that I cannot recommend SHIP. None of the issues require a redesign — all four blocker/medium items are single-file, single-function edits. **One focused fix-up session** should close the gates and earn a SHIP verdict on the next pass.

The architecture, taxonomy, and rendering choices are sound. The work to ship is small.

— Independent verification agent (Claude Opus 4.7), 2026-05-18
