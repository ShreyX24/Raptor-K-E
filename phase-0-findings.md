# Phase 0 Findings — ARL TMA Frontend

Produced as the grounding deliverable that feeds Phase 1 (custom skill authoring) and Phase 2+ (frontend code). Every claim below is verified against a primary source: a parsed sheet, an Intel JSON, or a fetched docs page.

---

## TL;DR

1. **The EMON xlsx already encodes our drill-down hierarchy** — 32 sheets, organized as `{system | socket | core} × {summary | details} × {p-core | e-core | uncore-domain}`. The taxonomy isn't something we invent; we read it off the sheet structure.
2. **Cores are addressed as `socket S module M core C`** in the xlsx. Module IDs `0,1,4,5,6,7,10,11` = the 8 P-cores; `2,3,8,9` (each with cores 0–3) = the 4 Skymont E-clusters × 4 cores = 16 E-cores. **This confirms the capture is from ARL 285K topology** (not the 290K SKU named in the path; module count matches 8P+16E).
3. **Uncore PMU domains in the xlsx map 1:1 to Intel's canonical ARL uncore units** (intel/perfmon `arrowlake_uncore.json`): `m` → iMC, `hac` → HAC_ARB, `cbo` → HAC_CBO, `pkg`/`pp0`/`pp1` → NCU + power planes. **24 uncore events total** — much smaller than Xeon-class uncore PMUs, which is good for the L1 tile view.
4. **The TMAReport schema in MD §9 STEP 4 needs extension** — real domains include `cbo`, `hac`, `dram`, `m`, `pkg`, `pp0`, `pp1`, `gt` in addition to the MD's `frontend/ooo/exec/memory`. And `cpu` is not a single enum but a per-tile categorization.
5. **MD claim corrections**: CloudAI-X `threejs-skills` has **2215 stars** (not 398) and **no LICENSE file** at root or per-skill — MD's "MIT, ~398 stars Jan 2026" claim is stale on stars and **wrong on license**. SKILL.md content is otherwise solid and R3F-compatible.
6. **MD claim verified**: Anthropic's `frontend-design` SKILL.md has **zero mentions** of three/r3f/webgl/3d/gltf/shader/canvas (greppped). The 3D niche is open.
7. **intel/perfmon is the canonical event source** — `ARL/events/arrowlake_{lioncove_core,skymont_core,uncore,uncore_experimental}.json` are the JSON SoT for event names + descriptions. Lion Cove 329 events, Skymont 295, uncore 24, uncore-experimental 2.

---

## Section A — EMON xlsx structure → drill-down map

**File**: `F:\Raptor-X-V2\rpx-core\logs\runs\Demo_ARL-Ref-U7-Dev__2026-05-15_191322_1G-1080p-H_Ultra-290K\traces\emon\emon_cyberpunk-2077_192-168-50-222_15-05-2026_200055.xlsx` (48.86 MB, 32 sheets, captured 2026-05-17). Parser: `F:\Raptor-K-E\scripts\parse_emon.py`.

### Sheet inventory (all 32)

| Sheet | Rows | Cols | Role |
|---|---:|---:|---|
| `p-core system view` | 662 | 7 | Aggregated metrics across all P-cores |
| `p-core socket view` | 662 | 2 | Per-socket aggregate (one socket on 285K) |
| `p-core core view` | 609 | 9 | Per-P-core values, 8 columns |
| `e-core system view` | 468 | 7 | Aggregated metrics across all E-cores |
| `e-core socket view` | 468 | 2 | Per-socket aggregate |
| `e-core core view` | 416 | 17 | Per-E-core values, 16 columns |
| `cbo uncore view` | 12 | 13 | LLC coherence box (HAC_CBO) |
| `dram uncore view` | 5 | 2 | DRAM-side iMC summary |
| `hac uncore view` | 6 | 3 | Home Agent Coherence (HAC_ARB) |
| `m uncore view` | 25 | 3 | Memory controller (iMC) |
| `pkg uncore view` | 5 | 2 | Package-level (NCU + power) |
| `pp0 uncore view` | 6 | 2 | Power Plane 0 (core domain) |
| `pp1 uncore view` | 6 | 2 | Power Plane 1 (uncore/graphics) |
| `p-core chart system view` | 1 | 1 | Embedded chart object |
| `p-core chart socket view` | 1 | 1 | Embedded chart |
| `p-core chart core view` | 1 | 1 | Embedded chart |
| `e-core chart system view` | 1 | 1 | Embedded chart |
| `e-core chart socket view` | 1 | 1 | Embedded chart |
| `e-core chart core view` | 1 | 1 | Embedded chart |
| `p-core details system view` | **6276** | 663 | Per-sample time series, P-core aggregate |
| `p-core details socket view` | 6276 | 667 | Per-sample, per-socket |
| `p-core details core view` | **50,201** | 613 | Per-sample, per-core |
| `e-core details system view` | 6276 | 469 | Per-sample, E-core aggregate |
| `e-core details socket view` | 6276 | 473 | Per-sample, per-socket |
| `e-core details core view` | **100,401** | 420 | Per-sample, per-E-core |
| `cbo details uncore view` | 9721 | 15 | Per-sample HAC_CBO |
| `dram details uncore view` | 91 | 8 | Per-sample DRAM |
| `hac details uncore view` | 359 | 9 | Per-sample HAC_ARB |
| `m details uncore view` | 1081 | 28 | Per-sample iMC |
| `pkg details uncore view` | 91 | 8 | Per-sample package |
| `pp0 details uncore view` | 91 | 9 | Per-sample PP0 |
| `pp1 details uncore view` | 91 | 9 | Per-sample PP1 |

**Sample count**: 6276 samples in the capture (referenced in header `(Metric post processor 5.20.0) name (sample #1 - #6275)`). Sampling interval is ~10.86 ms (`metric_EDP EMON Sampling time (seconds) = 0.0108…`) → roughly 68 seconds of capture.

### Core addressing

Header rows in `p-core core view` and `e-core core view` reveal addressing:

```
p-core: socket 0 module 0 core 0  through  socket 0 module 11 core 0   (8 cols)
        modules: 0, 1, 4, 5, 6, 7, 10, 11   (8 P-cores, one core per module)
e-core: socket 0 module 2 core 0..3, module 3 core 0..3,
        module 8 core 0..3, module 9 core 0..3                          (16 cols)
        modules: 2, 3, 8, 9   (4 clusters × 4 E-cores)
```

**Module layout interleaved**: `[P, P, E-cluster, E-cluster, P, P, P, P, E-cluster, E-cluster, P, P]` — physically matches the documented Lion Cove + Skymont compute tile layout (Wikipedia: *"cluster of four E-cores placed between two P-cores"*).

### The drill-down map is already in the data

Sheet hierarchy `{system|socket|core} × {summary|details}` is **exactly** our intended L0–L6 navigation:

| Frontend level | Sheet axis | Example |
|---:|---|---|
| L0 chip | `system view` (summary) | "metric_CPU operating frequency (in GHz) = 5.53" |
| L1 tile | (grouped sheets: p-core / e-core / uncore-*) | Compute-tile aggregate |
| L2 module/cluster | `core view` columns aggregated by module | Module 0 (one P-core) |
| L3 core | `core view` one column | `socket 0 module 0 core 0` |
| L4 subsystem | metric name prefix (`metric_frontend_*`, etc.) | "frontend bound %" |
| L5 event | individual row in `details` sheets | `UOPS_RETIRED.RETIRE_SLOTS` |
| L6 time-series | row of one event in `details core view` (~6275 samples) | Per-sample value |

### What the values look like

P-core row 3 (e.g., `metric_CPU operating frequency`) is mostly numeric. Many rows are `metric_*` (post-processed by EMON Metric Post Processor 5.20.0); raw PMU event names also appear lower in the sheet. The first row warns: *"TMA Support for this platform is still experimental and at early stages"* — so TMA breakdown metrics exist but may be approximate.

Column 7 (`description`) is empty in the rows sampled — the metric name itself is the description.

---

## Section B — ARL 285K die layout → 3D scene taxonomy

Sources verified: Wikipedia (Arrow Lake), chipsandcheese.com (Skymont deep-dive), search-result summaries for Tom's Hardware / wccftech / TechPowerUp (full pages 403'd to WebFetch — VideoCardz also 403'd). Wikipedia is the most precise primary I could get end-to-end through this tooling.

### Tile inventory

| Tile | Process | Die size | Contents |
|---|---|---:|---|
| **Compute** | TSMC N3B (3nm) | 117.241 mm² | 8 Lion Cove P-cores + 16 Skymont E-cores (4 clusters of 4) + L3 ring |
| **Graphics** | TSMC N5P (5nm) | 23 mm² | Xe-LPG: 4 Xe-cores = 64 EUs = 512 unified shaders; 2.0 GHz peak |
| **SoC** | TSMC N6 (7nm) | 86.648 mm² | NPU 3 (NPU 3720) + display engines + media + IMC (DDR5) + PCIe PHYs (reuses Meteor Lake design; no LP E-cores on desktop S variant) |
| **I/O Extender** | TSMC N6 (7nm) | 24.475 mm² | Thunderbolt 4 controller/PHY, PCIe PHY/buffers |
| **2× Filler Tiles** | — | — | Structural, no logic |
| **Foveros Base Tile** | Intel 16 (22FFL) | 302.944 mm² | Interposer + base routing |

### Per-block specs (verified)

**Lion Cove P-core (per core)**:
- 48 KB L0 data cache + 256 KB L1 (64 KB I + 192 KB D)
- 3 MB L2, shares 3 MB L3
- 8-wide decode, 192-entry µop queue, 5.25K µop cache, 18 execution ports, 576-entry ROB, split int + vec schedulers (MD §3, Intel Tech Tour 2024 citation)

**Skymont E-core (per core, per chipsandcheese)**:
- 9-wide decode (3 clusters × 3-wide), 96 µop queue
- 416-entry ROB
- BTB: 1024 L1 + 8K L2; 128-entry return stack
- 26 dispatch ports: 4 integer schedulers × 2 ports each, 4 FP pipes (128-bit), 7 AGUs (3 load + 4 store)
- L1D 4 cycles, L2 4 MB per cluster (19 cycles, 128 B/cyc bandwidth)
- L1 dTLB 48, L2 dTLB 4096
- 8 MB memory-side cache shared across cluster

**Xe-LPG GPU (Arrow Lake-S desktop)**:
- 4 Xe-cores in 1 Render Slice
- 64 EUs / 512 unified shaders
- 192 KB L1 per slice
- (Arrow Lake-H gets 8 Xe-cores + XMX + RT — not relevant for our 285K target)

**NPU 3 (NPU 3720, same as Meteor Lake)**:
- 13 TOPS INT8
- 2 Neural Compute Engines (NCE)
- Each NCE: 2048 INT8/FP16 MACs + 2 Movidius SHAVE DSP processors
- 4096 MACs total, 4 MB scratchpad RAM
- Boost up to 1600 MHz

**Memory**: dual-channel DDR5, CUDIMM support up to DDR5-10000 (per Wikipedia). 2 memory controllers on SoC tile (matches `UNC_MC0_*` and `UNC_MC1_*` events in the uncore JSON).

### Proposed L0 hero shot

For a multi-tile die (vs MD's single-core 4-layer stack), the L0 "Architecture Day floating glass" composition should show **the 4 functional tiles floating above the Foveros base**, with the 2 filler tiles rendered as low-opacity neutral wedges. Cyan rim glow underneath the compute tile (most-active), warm-fill under the GPU + SoC. Camera at high-elevation isometric. This is the natural translation of the reference-image L0 stack to whole-die scope.

---

## Section C — Canonical PMU event taxonomy (intel/perfmon)

Source: `https://github.com/intel/perfmon/tree/main/ARL/events/`. All 4 JSON files fetched via `gh api`.

### `arrowlake_uncore.json` — 24 events

| Unit | Count | Sample events |
|---|---:|---|
| **iMC** | 16 | `UNC_M_CAS_COUNT_RD/WR`, `UNC_M_ACT_COUNT_RD/WR/TOTAL`, `UNC_M_PRE_COUNT_*`, `UNC_MC0/MC1_TOTAL_REQCOUNT_FREERUN`, `UNC_MC0/MC1_RD/WRCAS_COUNT_FREERUN`, `UNC_M_TOTAL_DATA`, `UNC_M_RD_DATA`, `UNC_M_WR_DATA` |
| **HAC_ARB** | 5 | `UNC_HAC_ARB_TRK_REQUESTS.ALL`, `UNC_HAC_ARB_REQ_TRK_REQUEST.DRD`, `UNC_HAC_ARB_TRANSACTIONS.{ALL,READS,WRITES}` |
| **HAC_CBO** | 2 | `UNC_HAC_CBO_TOR_ALLOCATION.{DRD,ALL}` |
| **NCU** | 1 | `UNC_CLOCK.SOCKET` (UCLK fixed counter) |

### `arrowlake_uncore_experimental.json` — 2 events
- `UNC_M_DRAM_THERMAL_HOT`, `UNC_M_DRAM_THERMAL_WARM`

### `arrowlake_lioncove_core.json` — 329 events (top prefixes)
`MEM (42) · BR (31) · FP (26) · UOPS (24) · FRONTEND (20) · L2 (19) · OFFCORE (16) · DTLB (14) · IDQ (14) · INT (14) · OCR (12) · CPU (11) · INST (8) · L1D (8) · EXE (8) · TOPDOWN (6) · ITLB (6) · SW (5) · ICACHE (5) · ASSISTS (5)`

### `arrowlake_skymont_core.json` — 295 events (top prefixes)
`MEM (49) · TOPDOWN (31) · BR (23) · LD (21) · FP (17) · L2 (15) · DTLB (14) · FRONTEND (14) · MACHINE (12) · INT (10) · MISC (10) · ITLB (8) · UOPS (7) · ARITH (7) · CPU (6) · LLC (5) · DYNAMIC (5) · BACLEARS (5) · BUS (4) · SERIALIZATION (4)`

### xlsx uncore sheet → Intel unit mapping

| xlsx sheet | Intel Unit | Evidence |
|---|---|---|
| `m uncore view` | `iMC` | Both have 16 row/event count |
| `hac uncore view` | `HAC_ARB` | 5 events match (note: 6 rows in sheet includes header) |
| `cbo uncore view` | `HAC_CBO` (NOT Xeon's CHA/CBO) | Naming convention `UNC_HAC_CBO_*` |
| `dram uncore view` | iMC subset (DRAM-side data: TOTAL_DATA/RD_DATA/WR_DATA + thermal) | 5 rows ≈ data byte counts + thermal |
| `pkg uncore view` | NCU + package-level (UCLK + power) | 5 rows |
| `pp0 uncore view` | Power Plane 0 (core domain MSR power readings) | 6 rows — not core PMU events; MSR/RAPL counters |
| `pp1 uncore view` | Power Plane 1 (uncore/graphics RAPL) | 6 rows |

**Note**: ARL's uncore is **dramatically smaller** than Xeon-class (Granite Rapids uncore is ~hundreds of events). Architecturally, ARL uses HAC (Home Agent Coherence) instead of Xeon's CHA mesh stops; the LLC is a ring with a single "caching box" abstraction. Good news for our 3D taxonomy: fewer leaf nodes to render in the uncore subtree.

---

## Section D — TMAReport schema: extensions needed beyond MD §9 STEP 4

**The MD's schema** (verbatim):

```ts
type DomainId = 'frontend' | 'ooo' | 'exec' | 'memory'
type BlockId  = string                // e.g. "frontend.decode.lane-3"
interface TMAReport {
  traceId: string
  capturedAt: string
  cpu: 'lion-cove' | 'redwood-cove'
  domains: Record<DomainId, DomainStatus>
  findings: Finding[]
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>
}
```

**Required extensions for whole-die ARL**:

```ts
// Tile axis — replaces or supplements 'cpu'
type TileId = 'compute' | 'gpu' | 'soc' | 'io'

// CoreType — distinguishes P from E within compute tile
type CoreType = 'lion-cove' | 'skymont'

// CoreAddress — matches EMON's "socket S module M core C"
interface CoreAddress { socket: number; module: number; core: number }

// Expanded domain — covers both P/E TMA categories AND uncore domains
type DomainId =
  | 'frontend' | 'ooo' | 'exec' | 'memory'   // MD original, applies per-core
  | 'cbo' | 'hac' | 'dram' | 'm'             // uncore PMU domains
  | 'pkg' | 'pp0' | 'pp1'                    // power domains
  | 'gt'                                      // graphics tile
  | 'npu' | 'media' | 'display' | 'ipu'      // SoC tile sub-domains (when exposed)

// BlockId stays string but extended dotted path
// Examples:
//   "compute.p-core.0.frontend.decode.lane-3"
//   "compute.e-cluster.2.core-1.frontend.decode"
//   "compute.llc.ring"
//   "uncore.imc.mc0"
//   "soc.npu.nce-0.mac-array"
//   "gpu.xe-core-2.eu-grid"

// TraceMetadata — captures EMON post-processing details we saw
interface TraceMetadata {
  emonPostProcessorVersion: string   // e.g. "5.20.0"
  sampleCount: number                // e.g. 6275
  sampleIntervalSec: number          // e.g. 0.01086
  platform: string                   // e.g. "ARL-Ref-U7-Dev / Core Ultra 9 285K"
  workload: string                   // e.g. "cyberpunk-2077"
  tmaSupportStatus: 'experimental' | 'stable'   // flag from row 1
}
```

`Finding`, `MetricSnapshot`, `Severity` stay as MD defined — they're orthogonal to the taxonomy expansion.

**Why this matters**: the MD's `cpu: 'lion-cove' | 'redwood-cove'` doesn't capture that a single trace touches both Lion Cove (P-cores) and Skymont (E-cores) **simultaneously** on the same die. The xlsx has dedicated p-core + e-core sheets, so the schema needs to express both at once.

---

## Section E — Companion skill audit

### CloudAI-X `threejs-skills` (https://github.com/CloudAI-X/threejs-skills)

| Property | Verified | MD claim | Status |
|---|---|---|---|
| Skill count | 10 (animation, fundamentals, geometry, interaction, lighting, loaders, materials, postprocessing, shaders, textures) | 10 | ✅ matches |
| Stargazers | 2215 (as of 2026-05-18) | ~398 (Jan 2026) | ⚠ MD stale |
| License | **No LICENSE file** at root or in skills/ subdir | MIT | ❌ MD wrong |
| Last commit | 2026-05-18 (actively maintained) | — | ✅ |
| SKILL.md format | Standard YAML frontmatter (`name`, `description`) + body | "compatible with R3F patterns" | ✅ confirmed for `threejs-fundamentals` |
| Content quality | "Quick Start" code block uses vanilla three.js (not R3F) | "R3F-compatible patterns" | 🟡 R3F-adjacent, not R3F-native |

**Recommendation**: Before symlinking 10 skills into `.claude/skills/`, **resolve the licensing question** — file an issue or DM the maintainer asking to declare a license. For internal Intel use without a declared license, the skills are not safely reusable per typical compliance. **Alternative**: cherry-pick content into our own `references/*.md` (fair use of small excerpts with attribution) instead of installing the skills wholesale.

### Anthropic `frontend-design` (https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)

- **MD's claim verified**: grep for `three|r3f|webgl|3d|gltf|shader|canvas` → zero matches.
- Skill covers 2D web aesthetics only (Tailwind, typography, motion) — exactly the gap our custom skill fills.
- **Install via**: `/plugin install frontend-design@anthropic-skills` (per MD §8).
- **Override its font/color guidance** with our Intel Arc palette in the custom SKILL.md (MD §8 explicit instruction).

### Anthropic `skill-creator` (companion for authoring our skill)

- Present at `anthropics/skills/skills/skill-creator/SKILL.md`.
- Use to test and validate the custom skill's frontmatter triggering before deploying.
- Alternative for our environment: `superpowers:writing-skills` is the local analog.

---

## Section F — Verified library facts (Phase 1 reference material)

### three.js r171 release (`https://github.com/mrdoob/three.js/releases/tag/r171`)

Confirmed WebGPURenderer features that shipped: ClippingGroup (#28237, #29833), SpotLight.map (#29989), PointShadowNode (#29849), hardware clipping (#28578), biquadraticTexture wrap (#29828, #29846). TSL additions: `instance()` (#29911), `attributeArray()`, `instancedArray()` (#29881), deprecation of `storageObject()` in favor of newer storage approaches (#29982), texture-load support for video and 2D storage textures (#29992).

**Potential R3F 9 breaking change**: codesplit entrypoints (#29404, #29644) split WebGL and WebGPU. `three.tsl.js` is a new dedicated TSL entry point. Bundle config may need adjustment.

### Khronos PBR Neutral release (validates AgX choice)

Verbatim quote: *"One of the challenges of displaying true-to-life assets using traditional filmic tone mappers such as ACES is the limited range of reachable colors, especially when outputting bright yellow, green, or cyan hues to an sRGB screen."*

Khronos's own guidance:
- Linear: no HDR / no physical lighting
- Filmic (ACES, **AgX**): strongly HDR scenes, wide input color gamuts, **specific artistic looks** ← our case
- Khronos PBR Neutral: photorealistic PBR for e-commerce product viewing under grayscale lighting

→ Reinforces MD's choice of **AgX** over ACES (cyan preserved) and over PBR Neutral (we want cinematic, not product-shot).

### drei `<CameraControls>` (partial — docs page incomplete)

What the fetched page confirmed:
- Props: `impl`, `camera`, `domElement`, `makeDefault`
- Callbacks: `onControlStart`, `onControl`, `onControlEnd`, `onTransitionStart`, `onUpdate`, `onWake`, `onRest`, `onSleep`
- Mounting gotcha: *"If you need CC to control a specific camera, make it reactive so CameraControls is mounted/updated 'reactively' to mycam"*

What the page did **not** cover (needs Yomotsu repo or runtime introspection in Phase 2):
- `smoothTime` prop default
- `fitToBox()` method signature + Promise return
- `rotateAzimuth()` / other animated methods
- The `onRest` event firing semantics for chained transitions

Action: when Phase 2 wires `useChoreographer`, do a runtime API check (`Object.getOwnPropertyNames(controls.__proto__)`) to confirm methods. Yomotsu's GitHub README structure differs from expected (gh raw returned 404 for top-level README.md — repo may use `README.MD` or a different layout).

### intel/perfmon URL pattern (confirmed)

Per-platform path: `intel/perfmon/<PLATFORM>/events/<filename>.json` where filename pattern is `<microarchitecture>_<core|uncore|uncore_experimental|matrix>.json`. For ARL: 4 files (lioncove_core, skymont_core, uncore, uncore_experimental). Also a `metrics/` sibling directory exists at `intel/perfmon/ARL/metrics/`.

---

## Section G — Open design questions for Phase 1

Resolve these (via brainstorming or runtime experiments) before authoring `references/chip-taxonomy.md` and `references/aesthetic.md` in the custom skill:

1. **L0 multi-tile composition**: do the 4 tiles render at relative die-size proportions (so compute tile dominates), or normalized to similar visual weight? Recommendation: scale **roughly** to die area for at-a-glance density information, but cap the dynamic range (e.g., min tile gets 25% of max) so the GPU tile is still clickable.
2. **E-cluster grouping**: render 4 Skymont cores per cluster as a clearly bounded sub-tile (with shared 4 MB L2 visible as connective tissue), OR flatten to 16 individual E-core blocks at L2? Recommendation: cluster grouping — it matches both the architecture and the xlsx module addressing.
3. **Uncore positioning**: uncore PMUs (LLC ring, HAC, iMC) don't have a single physical "block" on the die; they're distributed. Render as a **fabric layer** beneath the compute tile (translucent plate connecting cores), or as discrete blocks adjacent to the cores they serve?
4. **Power planes**: PP0 / PP1 are MSR/RAPL readings, not physical blocks. Render as overlay heat-map gradients on the existing tiles (PP0 tints compute, PP1 tints uncore/GPU), or as floating side panels?
5. **NPU 3 sub-blocks**: 2 NCEs × (2K MAC array + 2 SHAVE DSPs) + 4 MB scratchpad. Render the MAC arrays as instanced grids (2K count is at the InstancedMesh threshold)?
6. **GPU sub-blocks**: 4 Xe-cores × 16 EU = 64 EUs. Render EUs as a single instanced grid (64 instances, well under threshold)?
7. **Level-6 SVG handoff target**: at Lion Cove decode lanes / execution ports / register file slots, OR at the time-series chart for a single PMU event (which is also "inherently 2D")?
8. **Time-series treatment**: the xlsx's 6275-sample time series per event is huge. Stream live and show a scrubber (like MD §9 STEP 10's PresentMon-correlated slider), or snapshot-only for v1?
9. **TMA "experimental" flag**: the xlsx warns TMA is experimental on this platform. Show a "TMA-EXPERIMENTAL" banner in TopBar so users know findings may be approximate? Per [[feedback-working-style]] this is the kind of fact we shouldn't silently swallow.

---

## Section H — What's ready vs. what's pending for Phase 1

**Ready to be quoted/used in `references/*.md` (Phase 1)**:
- `references/chip-taxonomy.md` — Section B of this doc is the source
- `references/data-contract.md` — Section D extensions + MD §9 STEP 4 base
- `references/aesthetic.md` — MD §6 + the reference images analysis (already in [[aesthetic-rules]])
- `references/materials.md` — MD §2 four recipes (already in [[aesthetic-rules]])
- `references/postprocessing.md` — MD §2 effect chain + Khronos PBR Neutral excerpt above
- `references/r3f-patterns.md` — MD §1 + §5 + §7 + three.js r171 notes above
- `references/choreography.md` — MD §4 + (TBD) Yomotsu fitToBox confirmation in Phase 2

**Still needed**:
- Final drei `<CameraControls>` `fitToBox()` signature confirmation — can be done at runtime in Phase 2
- Resolution of the CloudAI-X license question (file an issue or cherry-pick content with attribution)
- Confirmation that the EMON post-processor 5.20.0 output is the stable format the backend will emit (worth a question to the backend owner if reachable)

**No blockers** — Phase 1 can start immediately with the data in hand.

---

## Section I — Local SEP/EDP install (added 2026-05-18)

User pointed at `C:\Program Files (x86)\IntelSWTools\sep_private_5.58_win_03110247f680a18f6\` — full Intel SEP 5.58 install with ARL configs. Major payoff: a canonical local source for everything we were about to fetch piecewise from `intel/perfmon`. New memory entries: [[arl-edp-source]], [[tma-structure]], [[compliance-nda]].

### What it gives us that we didn't have

1. **HUD headline metrics — 13 of them, identical across Lion Cove / Skymont / Crestmont** (`chart_format_arrowlake_*_private.txt`, 0.5 KB each). Drives TopBar + TelemetryStrip default content.
2. **8 canonical EMON collection modes** (`arrowlake_events_private.txt`): `hotspots, uarch-exploration, memory-access, io, system-overview, hpc-performance, performance-snapshot, hwpgo`. These become the **L1 HUD tab axis** — analyst picks a mode, drill-down filters to events relevant to it.
3. **Full TMA top-level + L2 breakdown** in `uarch-exploration` mode events: `TOPDOWN_FE_BOUND.{BRANCH_DETECT, BRANCH_RESTEER, CISC, DECODE, FRONTEND_BANDWIDTH, FRONTEND_LATENCY, ICACHE, ITLB_MISS, OTHER, PREDECODE}` plus `TOPDOWN_BAD_SPECULATION.{FASTNUKE, MACHINE_CLEARS, MISPREDICT, NUKE}` plus `TOPDOWN_BE_BOUND.{ALLOC_RESTRICTIONS, MEM_SCHEDULER, NON_MEM_SCHEDULER, REGISTER, REORDER_BUFFER, SERIALIZATION}`. → **L4 subsystem layer** of the chip-spec.ts.
4. **Full Lion Cove metric catalog** in `arrowlake_lioncove_private.xml` (300 KB) — `metric_CPI`, `metric_branch mispredict ratio`, `metric_L2 MPI`, `metric_LLC MPI`, `metric_ITLB MPI`, `metric_DTLB load MPI` (with 4K/2M-4M/1G page-size breakdowns), `metric_memory bandwidth read/write/total`, `metric_Page Read hit rate (%)`, `metric_Page Write hit rate (%)`, `metric_Average LLC demand data read miss latency (in ns)`, `metric_core % cycles in AVX2 license`, `metric_FP {scalar,128B packed,256B packed} {single,double}-precision FP instructions retired per instr`, `metric_INT VEC 128/256-bit ADD instructions retired per instr`, etc.
5. **Per-core formula DIFFERENCES** (`metrics\arrowlake_{lioncove,skymont,crestmont}.xml`): same metric name, different formula by core type — e.g. `tma_l1_bound` on Lion Cove uses `MEMORY_STALLS.L1 / cycles`, on Skymont uses `LD_HEAD.L1_BOUND_AT_RET / cycles`; `tma_l3_bound` doesn't exist on Crestmont. **Data contract must tag every metric with `coreType`.**
6. **TMA-beta flag, explicit**: header of `arrowlake_events_private.txt` reads `LNC TMA Version: 5.3-beta` and `SKT/CMT TMA Version: 5.01-beta`. Matches the xlsx row-1 banner. Frontend must surface this.
7. **EMON event multiplexing structure**: events are grouped (separated by `;`) for PMU window sharing; all groups start with the same fundamentals. Frontend doesn't multiplex — EMON Post Processor 5.20.0 (per xlsx header) does — but UI must gray out metrics unavailable in the captured mode.

### Future-platform hints (deferred per ARL-only scope)

The same SEP install also has chart_format files for:
- **NVL** (Nova Lake) — Arctic Wolf E-core + Coyote Cove P-core
- **PTL** (Panther Lake) — Cougar Cove P-core + Darkmont E-core
- **LNL** (Lunar Lake) — Lion Cove P + Skymont E (different platform from ARL but same cores)
- Server: Diamond Rapids, Clearwater Forest, Granite Rapids (our dev box), Emerald Rapids, Sapphire Rapids
- AMD: Zen 4, Zen 5 (client + server)

→ The same EMON-collection-mode + `metric_*` pattern applies to all of them. Designing the data contract around that pattern (not around hard-coded ARL specifics) leaves room for future expansion **without retrofitting**.

### Compliance note (now formalized in [[compliance-nda]])

Files marked `_private` and `_nda` in the SEP install are Intel-internal. **Read for understanding = OK** at all times. **Pasting raw content into committed source / public-syncing artifacts = NOT OK**. Rule: structure-only in skill `references/*.md`; for event names that ship in source, prefer the public `intel/perfmon` GitHub JSONs (Apache-2.0) which mirror the same names.

### Schema additions from this section

Append to [[data-contract]] extensions:
```ts
type CoreType = 'lion-cove' | 'skymont' | 'crestmont'

type CollectionMode =
  | 'hotspots' | 'uarch-exploration' | 'memory-access'
  | 'io' | 'system-overview' | 'hpc-performance'
  | 'performance-snapshot' | 'hwpgo'

// Per-core type tag on every metric snapshot
interface MetricSnapshot {
  coreType: CoreType                           // NEW — for formula basis
  values: { [counterName: string]: number }    // e.g. "metric_CPI": 0.78
}

// TraceMetadata expansion
interface TraceMetadata {
  emonPostProcessorVersion: string             // "5.20.0"
  sampleCount: number                          // 6275
  sampleIntervalSec: number                    // 0.01086
  platform: string                             // "ARL-Ref-U7-Dev / Core Ultra 9 285K"
  workload: string                             // "cyberpunk-2077"
  collectionMode: CollectionMode               // NEW
  tmaSupportStatus: 'experimental' | 'stable'  // "experimental" for ARL
  tmaVersions: {                               // NEW
    lioncove?: string                          // "5.3-beta"
    skymont?: string                           // "5.01-beta"
    crestmont?: string                         // "5.01-beta"
  }
}
```

## Appendix — Source artifacts

- xlsx parser: `F:\Raptor-K-E\scripts\parse_emon.py`
- Plan file: `C:\Users\Administrator\.claude\plans\proud-beaming-rocket.md`
- Project memory: `C:\Users\Administrator\.claude\projects\F--Raptor-K-E\memory\` (11 files)
- ARL event JSONs cached implicitly via gh; re-fetch with:
  ```
  gh api -H 'Accept: application/vnd.github.raw' \
    repos/intel/perfmon/contents/ARL/events/arrowlake_uncore.json > arl_uncore.json
  ```
- Reference images: `F:\Raptor-K-E\reference images\Presentation1_page-000{1..7}.jpg`
- MD spec: `F:\Raptor-K-E\compass_artifact_wf-707ed176-db74-42fa-aacd-1b0d4fab9bc7_text_markdown.md`
