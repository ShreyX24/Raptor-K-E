---
name: raptor-tma-3d
description: Use when working in the raptor-tma frontend codebase, editing files under F:\Raptor-K-E\frontend\, authoring React Three Fiber components, implementing exploded-isometric chip visualization, handling Intel Lion Cove or Skymont or Arrow Lake (ARL 285K / 270K+) microarchitecture rendering, wiring TMA findings or EMON metrics into 3D meshes, choreographing drill-down camera moves with fitToBox, applying Intel Architecture Day cyan-rim aesthetic with AgX tone mapping, modifying chip-spec.ts taxonomy, writing PBR materials, or building postprocessing chains for hardware diagnostic 3D scenes. Triggers on phrases like exploded chip, Lion Cove visualization, ARL die, drill into Front End, 3D diagnostic, Architecture Day look, TMA scene, explode the decode cluster, render the GPU tile, chip-spec, severity emissive, even when the project name is not explicitly mentioned.
license: Internal Intel use only
---

# raptor-tma 3D Skill

Governs the cinematic exploded-isometric 3D React frontend that visualizes the Intel Arrow Lake (ARL 285K / Core Ultra 9 270K+) die and binds backend TMA findings onto every block. When editing this codebase, defer to the rules below.

## When to read which reference

| If the task is about... | Read first |
|---|---|
| Scene structure, instancing, R3F hooks, anti-patterns | `references/r3f-patterns.md` |
| PBR material choices, emissive glow, transmission | `references/materials.md` |
| Effect chain, bloom, AO, DoF, tone mapping | `references/postprocessing.md` |
| Camera moves, fitToBox, drill-down choreography | `references/choreography.md` |
| ARL block hierarchy: what tiles/cores/clusters exist | `references/chip-taxonomy.md` |
| Rules-engine JSON contract + Zustand binding | `references/data-contract.md` |
| Color tokens, fonts, lighting recipe, HUD chrome | `references/aesthetic.md` |

Default to `references/r3f-patterns.md` + `references/aesthetic.md` on any non-trivial change.

## The goal — read this before each work block

The primary goal is **rendering the 3D model**. Data binding is Phase 4, not Day 1.

1. L0 hero shot = 4 floating tile-plates (compute / GPU / SoC / IO) with cyan glow underneath. **First milestone.**
2. Drill-down ≥4 levels with smooth fitToBox transitions.
3. Procedural sub-blocks revealed at each drill level.
4. HUD chrome (TopBar / Breadcrumb / FindingsPanel / TelemetryStrip).
5. **THEN** data binding (severity → emissive lerp; CRITICAL pulse).

EMON / SEP / PMU context is for **taxonomy block counts only**. This is NOT a data-pipeline project. If a task feels like data plumbing, stop and re-read this section.

## Standing rules

### Architecture
- Procedurally generate every chip mesh from `src/data/chip-spec.ts`. Never hand-author a Blender mesh for blocks/sub-blocks. The chip housing is the only optional GLB asset.
- One Zustand store at `src/state/store.ts`. No Context, Redux, or Jotai. Subscribe with selectors.
- Backend contract is the JSON schema in `references/data-contract.md`. Do not invent fields.
- Scope is ARL only (compute / GPU / SoC / IO tiles + uncore). Future families (NVL / PTL / LNL) are deferred.

### Rendering
- WebGL2 renderer. Do not ship WebGPU in v1.
- `frameloop="demand"` default; `invalidate()` from data updates and tween steps.
- `THREE.ColorManagement.enabled = true`; `outputColorSpace = SRGBColorSpace`; tone mapping = `AgXToneMapping`.
- Selective bloom: `luminanceThreshold = 1.0` (never 0). Only emissive materials with intensity > 1 bloom.
- Instance any geometry that repeats more than 4 times. Use raw `THREE.InstancedMesh` (not drei `<Instances>`) above ~100 instances per type.

### Aesthetic
- Background `oklch(0.18 0.02 250)` (near-black blue). No skybox.
- Warm directional key `#fff4e0` upper-right; Arc-cyan rim `#00b2ff` below-back; cool fill `#4dd0ff` from left.
- Materials: dark anodized aluminum for block bodies, brushed metal for interconnects, transmission for housing, emissive cyan edges on focused subtree.
- Pulse only on CRITICAL severity (~6 rad/s). YELLOW/RED are static-elevated, do not pulse.
- HUD chrome: dark glassmorphic, but **never** `backdrop-filter: blur(>8px)` over the canvas (re-rasterizes the canvas every paint).

### Camera
- Use drei `<CameraControls>` (wraps Yomotsu camera-controls). Never `OrbitControls`.
- Drill-down: `await cameraControls.fitToBox(targetMesh, true, { paddingTop: 0.2, paddingBottom: 0.2 })`.
- Sibling fade-out to opacity 0.08 on enter; restore to 1.0 on exit. Parent shells stay as wireframe `<Edges>`.
- Always update breadcrumb store on focus change. Esc pops `focusPath` and reverses.

### Performance budget
- ≤200 draw calls at depth 0; ≤500 at any depth.
- ≤16 ms/frame at 1440p on discrete-GPU Chrome. Target 120 fps stretch on the RTX 4090 workstation.
- KTX2 for all textures > 256². Meshopt for all GLB.
- Hoist `THREE.Vector3` / `THREE.Color` out of `useFrame` (zero per-frame allocations).

### Anti-patterns to refuse
- Mounting/unmounting meshes on focus change (use opacity + `visible={false}`)
- Setting `material.color` via React prop in hot loop (lerp via ref in `useFrame`)
- drei `<Instances>` for >100 instances (drop to raw `InstancedMesh`)
- `backdrop-filter: blur(>8px)` on panels overlapping the canvas
- `setState` from inside `useFrame` (infinite loop)
- `<Canvas>` in React Strict Mode without explicit GPU `.dispose()` cleanup
- Inter / Roboto / IBM Plex / system fonts (stack is Geist + Geist Mono)
- Inventing fields on the TMAReport contract
- `OrbitControls` (no fitToBox, no smoothing)
- `new THREE.Vector3()` inside `useFrame` (GC thrash)
- `Bloom luminanceThreshold={0}` (everything glows)
- `<Html>` without `transform` prop (wrong scale)
- Missing `outputColorSpace = SRGBColorSpace` (milky materials)
- Theatre.js Studio in production bundle (debug-only)
- `MeshBasicMaterial` everywhere (no PBR response)
- Hand-written GLSL when TSL or built-in materials work
- SSR/SSGI via `realism-effects` (perf cliff for chip scene without reflective floors)
- `<Suspense>` per block (hiccup at every drill — suspend only at the chip-housing GLB)

## Companion skills

- For 2D HUD chrome aesthetics → `frontend-design` (Anthropic). **Override** its font/color suggestions with the Arc palette in `references/aesthetic.md`.
- For perf verification → `chrome-devtools-mcp:chrome-devtools` (MCP). Use for Phase 2+ frame profiling.
- For three.js API lookups → `intel/perfmon` JSONs (public, Apache-2.0) for ARL event names; the CloudAI-X `threejs-*` skills are reference-grade but have no LICENSE — use as inspiration, not symlinked install.
- For skill iteration → `superpowers:writing-skills`.

## Examples of triggering requests

- "Add a new Xe-core to the GPU tile" → read `chip-taxonomy.md` + `r3f-patterns.md`, edit `chip-spec.ts`; mesh emits automatically.
- "Make the decode cluster pulse red when bad-spec is high" → read `data-contract.md` + `materials.md`; wire severity-driven `emissiveIntensity` lerp.
- "Camera move into Front End feels jerky" → read `choreography.md`; check `smoothTime` (0.6) and `onRest` event sequencing.
- "Side panel dropping framerate" → read `r3f-patterns.md` perf section; almost certainly `backdrop-filter: blur` over canvas.
- "Add a TopBar TMA-experimental banner" → read `aesthetic.md` HUD section + `data-contract.md` TMA-beta note.
- "Explode the L3 cache ring" → read `chip-taxonomy.md` uncore-overlay section + `choreography.md` fan-explode pattern.

## When the task is genuinely 2D

If the user asks for side panel, top bar, or pure DOM/Tailwind work, this skill still applies for color tokens and typography (see `references/aesthetic.md`). For everything else 2D, defer to `frontend-design` (with the override above).

## Red flags — STOP and re-read

- Spending tool calls on data parsing or schema design when no frame has rendered yet
- Reaching for `OrbitControls` because "it's simpler"
- Importing Inter because "shadcn defaults to it"
- Mounting/unmounting on click "for simplicity"
- "I'll just put `backdrop-filter blur(20px)` on this one panel"
- Authoring deep PMU encyclopedia content in `chip-spec.ts`
- Extending `TMAReport` because "we might need it"

All of these mean: re-read this SKILL.md and the relevant reference file.

## Workspace constants

- **Project root**: `F:\Raptor-K-E\`
- **Frontend root**: `F:\Raptor-K-E\frontend\` (Phase 2 will bootstrap)
- **Golden spec MD**: `F:\Raptor-K-E\compass_artifact_wf-707ed176-db74-42fa-aacd-1b0d4fab9bc7_text_markdown.md`
- **Reference images**: `F:\Raptor-K-E\reference images\Presentation1_page-000{1..7}.jpg`
- **Phase 0 findings**: `F:\Raptor-K-E\phase-0-findings.md`
- **Project memory**: `C:\Users\Administrator\.claude\projects\F--Raptor-K-E\memory\`
- **Dev host**: Intel GNR-WS workstation, 64C/128GB, RTX 4090 (24GB) + RTX 4080 (16GB), Windows 11 Pro
- **Backend**: separate (not in this repo); emits `TMAReport` JSON; future migration to Linux/Habana Gaudi 3
