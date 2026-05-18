# Phase 4 — IHS Boot Sequence + Delid Animation + Data Binding

**Status**: spec captured 2026-05-18 (end of Phase 3 session). Build in a fresh session.

---

## Where Phase 3 left off

- L0 hero shot: portrait 4-quadrant chiplets (Compute TL / GPU TR / IOE BL / SoC BR) on a static BaseTile, ~72°/0° canonical camera, matte tiles (≤5% reflection), 60 fps.
- Drill-down: ≥4 levels, fitToBox via custom setLookAt, breadcrumb + Esc, all acceptance gates green.
- Repo pushed to github.com/ShreyX24/Raptor-K-E.
- Memory captures: `l0-layered-layout`, `layer-plan-doc`, `camera-top-down`, `chrome-uncapped-fps`.

## Phase 4 goal

Replace the cold L0 reveal with a **boot animation** that frames the user's first impression as "we're looking at a real CPU loading its diagnostics". Then bind backend TMA data to severity-driven emissive on each block.

## The boot sequence (3 acts)

### Act 1 — IHS Identification (page-load → data loaded)

Show the **Integrated Heat Spreader** (IHS) — the physical metal lid of the package — covering the dies. Reference: `F:\Raptor-K-E\reference images\processor-s-l400.jpg`.

**Visual specs**:
- IHS mesh: large rectangular plate (~12×18×0.5 — same X/Z footprint as BaseTile, sits on top covering all chiplets at Y ≈ 1.5)
- Material: brushed dark nickel/gray metal
  - color `#3a3d42`, metalness 0.9, roughness 0.35, clearcoat 0.6, anisotropy
  - subtle horizontal brush lines via normal map OR procedural anisotropic highlight
- Beveled edges (slight chamfer at top corners — match the L-shaped notches on real IHS)
- Optional: cut-outs / orientation notches matching LGA1851 keying (top-left + bottom-left small triangles)

**Text overlays** (drei `<Html transform>` anchored to IHS top face):
- Top centered, larger: silicon family identifier — `ARL Client Platform` (from backend `TMAReport.silicon_family`)
- Below, slightly smaller: CPU SKU — `Intel Core Ultra 9 270K Plus` (from `TMAReport.cpu_sku`)
- Optional bottom-right: batch ID / signature line in monospace small — `SRQDS · L537F370` (decorative)
- Font: Geist (per skill). Subtle cyan glow on text edges via CSS `text-shadow`.

**Loading affordance** while waiting for backend data:
- **Option A (recommended)**: animated RGB conic-gradient border running around the IHS perimeter (3D — shader on the perimeter ring mesh, or 2D Html element pinned to the IHS edges via projected coords). Hue rotates over 2s.
- **Option B**: cyan pulse — emissive ring at the IHS perimeter that breathes at ~0.8 Hz.
- **Option C**: subtle scanning line traveling north→south across the IHS top face every 1.5s.
- Choose A for hero impact; falls back to B if A becomes a draw-call problem.

**Camera in Act 1**: closer + lower elevation (~55°) than the canonical 72° L0 so the IHS top face reads cinematically with the text legible. Distance ~22.

### Act 2 — Delid Transition (~1.2s, triggered when data arrives)

When `useStore.getState().loadTrace(report)` fires (data loaded):

1. **t = 0 ms**: RGB border stops, settles to solid cyan
2. **t = 0–200 ms**: IHS emissive flashes cyan briefly (data acknowledged)
3. **t = 200–800 ms**: IHS animates **upward** (Y: 1.5 → 6.0) AND **rotates slightly** (around X axis) for a dramatic lift. easeOutCubic timing. Use `useFrame` + a single `<Float>` controller, NOT React state per frame.
4. **t = 200–1000 ms**: IHS fades out (opacity 1.0 → 0). Beyond a point it disappears.
5. **t = 400–1200 ms (parallel)**: camera dollies from "Act 1 IHS angle" (~55°/0°/22) to "canonical delidded L0" (72°/0°/36). Use `cameraControls.setLookAt(...true)` with `smoothTime=0.8`.
6. **t = 800–1200 ms**: chiplets fade in (opacity 0 → 1) as the IHS disappears.
7. **t = 1200 ms**: hand off to normal interaction (hover / click drill works as today).

### Act 3 — Normal interaction (post-boot)

Identical to current Phase 3 behavior. The IHS can be re-shown by reloading the page or via a hidden "Re-lid" debug button.

## What needs to be built

### Components / files

| File | Purpose |
|---|---|
| `src/scene/IHS.tsx` | new — heat spreader mesh + material + perimeter loading animation |
| `src/hud/IHSText.tsx` | new — Html-anchored silicon-family + CPU SKU labels on IHS top face |
| `src/hud/RGBBorder.tsx` | new — animated conic-gradient ring around IHS while loading (CSS-driven via `<Html>` or three.js ShaderMaterial) |
| `src/animation/delidAnimation.ts` | new — controller for the lift+fade+camera-dolly sequence |
| `src/state/store.ts` | extend — add `bootState: 'lidded' \| 'delidding' \| 'delidded'`, `siliconFamily`, `cpuSku` |
| `src/camera/Choreographer.ts` | extend — Act 1 framing constants (`IHS_CAMERA_POS`, `IHS_LOOK_AT`); switch to canonical L0 only after `bootState === 'delidded'` |
| `src/scene/ChipScene.tsx` | wire — mount IHS when `bootState !== 'delidded'`, hide chiplets when `bootState === 'lidded'` |
| `src/data/mockTrace.ts` | new — debug-only mock `TMAReport` JSON for triggering the delid in dev |
| `src/hud/LoadTraceButton.tsx` | new (dev only) — "Load trace" button that fires `loadTrace(mockTrace)` to test the delid |

### State

```ts
interface RaptorStore {
  bootState: 'lidded' | 'delidding' | 'delidded'
  siliconFamily: string    // "ARL Client Platform" from TMAReport.silicon_family
  cpuSku: string           // "Intel Core Ultra 9 270K Plus" from TMAReport.cpu_sku
  // ... existing focusPath / findings / metrics / narrative
  
  beginDelid: () => void       // sets state to 'delidding', kicks off animation
  finishDelid: () => void      // sets state to 'delidded' after animation completes
}
```

`loadTrace(r)` should also call `beginDelid()` if `bootState === 'lidded'`.

### Schema extension (backend contract)

```ts
interface TMAReport {
  // ... existing fields
  silicon_family?: string  // e.g., "ARL Client Platform"
  cpu_sku?: string         // e.g., "Intel Core Ultra 9 270K Plus"
  batch_id?: string        // optional decorative — "SRQDS L537F370"
}
```

These are NEW optional fields — backend must update or we fall back to placeholder strings.

## Data binding (Phase 4 second half — after the boot sequence works)

Once Act 3 is reached, the canonical Phase 4 work begins per the golden spec:

1. **Severity → emissive lerp** per block:
   - `useStore` subscribes to `findings[blockId]` for each Block
   - Lerp `emissiveIntensity` based on severity: GREEN=0.3 / YELLOW=0.7 / RED=1.0 / CRITICAL pulse 0.4↔1.4 at 6 rad/s
   - Lerp `emissive` color: cyan → yellow → red as severity escalates
2. **PMU counter overlays** via drei `<Html transform>` on each block's top face (top-down camera makes this readable):
   - 1-2 most-important counters per block
   - Updates on `metrics[blockId]` changes
3. **FindingsPanel** slide-in from right when a finding-bearing block is focused
   - Use the rules-engine narrative text from `narrative[blockId]`
4. **`frameloop="demand"` + `invalidate()`** — switch from `frameloop="always"`. Call `invalidate()` only on data update + tween steps. Saves laptop battery.

## Acceptance criteria

- [ ] Page load shows IHS with brushed-metal look + text labels + animated RGB border
- [ ] No chiplets visible while `bootState === 'lidded'`
- [ ] On `loadTrace()`, IHS lifts and fades over ~1s
- [ ] Camera transitions smoothly from IHS view to canonical L0
- [ ] Chiplets fade in as IHS fades out
- [ ] Post-delid: identical to Phase 3 (drill still works, breadcrumb still works, Esc still works)
- [ ] No frame drops during the animation on 60Hz workstation (still 60 fps; ~120 fps in uncapped Chrome)
- [ ] Severity colors blocks correctly when data has findings
- [ ] PMU counters visible as `<Html>` overlays on each block's top face

## Open questions for Phase 4 start

1. **IHS markings**: photo-realistic engraving (texture) or procedural emissive lines? Texture is more authentic but adds an asset. Procedural is lighter.
2. **Re-lid affordance**: needed for production, or dev-only debug button? (User can answer at start of Phase 4.)
3. **Multiple silicon families**: spec says "if log is of ARL family" — implying other families later (NVL? PTL?). For Phase 4, ARL-only IHS. Variant lookup hook in `IHS.tsx`.
4. **`<Html transform>` vs `<Text>`**: text on IHS face. drei `<Text>` (SDF-rendered 3D text) is GPU-cheap and rotates with the mesh; `<Html>` is DOM and always screen-aligned. For IHS text we WANT it stuck to the IHS face (rotates with it during lift), so `<Text>` is correct. For PMU counters in Act 3 we want screen-aligned readability, so `<Html>` is correct.

## Reference assets

- `F:\Raptor-K-E\reference images\processor-s-l400.jpg` — actual 285K IHS photo
- `F:\Raptor-K-E\reference images\dieshot.jpg` — annotated die-shot for matching delidded view
- `F:\Raptor-K-E\reference images\hero-image.fill.size_1200x675.jpg` — Intel Arc Day aesthetic for delidded mode
- `F:\Raptor-K-E\LAYER-PLAN.md` — chip taxonomy + sub-block hierarchy

## Suggested Phase 4 milestone order

1. **State + bootState plumbing** in Zustand (5 min, no visual change yet)
2. **IHS.tsx mesh** — brushed metal plate, no text yet (verify it covers the chiplets)
3. **IHS conditional render** in ChipScene — show IHS when `lidded`, hide chiplets
4. **IHSText.tsx** — drei `<Text>` for silicon family + CPU SKU (anchored to IHS top, rotates with it)
5. **RGB border** — perimeter animation (start simple: pulsing cyan; iterate to RGB conic later)
6. **mockTrace.ts + LoadTraceButton** — dev tooling to trigger delid
7. **delidAnimation.ts** — the 1.2s sequence (IHS lift+fade, chiplet fade-in, camera dolly)
8. **Severity binding** in Block.tsx — emissive lerp based on `findings[spec.id]`
9. **PMU counter `<Html>` overlays** on each visible block
10. **FindingsPanel** slide-in
11. **`frameloop="demand"` + `invalidate()`** switch

Each milestone gets its own screenshot via chrome-devtools-mcp + visual sign-off before moving on. Same workflow as Phase 3.

---

**End of Phase 4 prompt.** Paste this as the first message in a fresh Claude Code session at `F:\Raptor-K-E\` to start.
