# ARL Chip Taxonomy for raptor-tma

Block counts and layout for the Arrow Lake 285K die (Core Ultra 9 270K+ is microarchitecturally identical). Use this to populate `src/data/chip-spec.ts`. **This is a rendering reference, NOT a PMU encyclopedia** — for the data shape see `references/data-contract.md`.

## L0 — 4 tiles (the hero shot)

| Tile | Process | Die size | Role |
|---|---|---:|---|
| **Compute** | TSMC N3B | 117.241 mm² | 8 Lion Cove P-cores + 16 Skymont E-cores + L3 ring |
| **Graphics** | TSMC N5P | 23 mm² | 1 Xe-LPG render slice (4 Xe-cores, 64 EUs) |
| **SoC** | TSMC N6 | 86.648 mm² | NPU 3 + IMC + media + display + IPU + LP-island |
| **I/O** | TSMC N6 | 24.475 mm² | TBT4 + PCIe 5.0 PHY + display PHY |

Plus 2 **filler tiles** (structural, no logic — render as low-opacity neutral wedges) and the **Foveros base tile** (Intel 16 / 22FFL) underneath at 302.944 mm².

**L0 sizing rule**: scale tile width roughly to die area but cap dynamic range (min tile ≥ 25% of max width) so the I/O tile stays clickable. Cyan rim glow under each plate via the `<pointLight>` from `aesthetic.md`.

**Phase 2 verified L0 layout** (all 4 plates clearly visible at 60 fps):

```ts
// Y stack — 2.4-unit gaps centered around origin so default CameraControls target works
const PLATE_Y = {
  compute: 3.6,
  gpu:     1.2,
  soc:    -1.2,
  io:     -3.6,
}

// Camera — isometric ~43° elevation, fov 38, distance ~22 from origin
camera={{ position: [10, 11, 14], fov: 38, near: 0.1, far: 100 }}

// Plate footprint normalization — without this, the small tiles (gpu 5x4, io 4x3)
// hide behind the large compute plate (8x12). The MD §3 "min ≥25% of max" rule
// applies; in code: clamp normalized dim to 60% of max for clear visual separation
// while preserving actual die areas in chipSpec for inner drill-down.
function l0Footprint(width, depth, maxW, maxD) {
  const MAX_VIS = 10, MIN_VIS_RATIO = 0.6
  return {
    w: Math.max(MIN_VIS_RATIO * MAX_VIS, (width / maxW) * MAX_VIS),
    d: Math.max(MIN_VIS_RATIO * MAX_VIS, (depth / maxD) * MAX_VIS),
  }
}
```

## L1 — Compute tile interior

Compute tile = **8 P-cores + 4 E-clusters × 4 E-cores each**. Physical layout interleaves: per Wikipedia, *"cluster of four E-cores placed between two P-cores."*

EMON addresses cores as `socket S module M core C`:

| Type | Modules | Cores per module | Total cores |
|---|---|---:|---:|
| P-core (Lion Cove) | 0, 1, 4, 5, 6, 7, 10, 11 | 1 | 8 |
| E-cluster (Skymont) | 2, 3, 8, 9 | 4 | 16 |

→ `chip-spec.ts` should emit blocks in module order so physical layout matches EMON addressing.

Plus the L3 ring as an overlay band beneath the cores (uncore PMUs: `UNC_HAC_CBO_*`).

## L2 — Inside one Lion Cove P-core

4 sub-layers per MD §3:

1. **Front End (8-wide decode)**
   - Branch Predictor (8× wider than Redwood Cove)
   - Fetch (64 B/cyc)
   - Decode (8-wide → instance 8 lanes)
   - µop Cache (5.25K-entry, was 4096 in Redwood Cove)
   - µop Queue (192-entry, was 144 in Redwood Cove)

2. **Out-of-Order Engine**
   - 576-entry ROB (was 512 in Redwood Cove)
   - Split integer + vector schedulers

3. **Execution Ports (18 wide)**
   - Instance 18 ports; each labeled by lane number
   - Ports include ALU, AGU, JMP, STD, FMUL/FADD/AES/SHA/IMUL/FDIV

4. **Memory Subsystem**
   - 48 KB L0D (new in Lion Cove)
   - 256 KB L1 (64 KB I + 192 KB D)
   - 3 MB L2 per core
   - 3 MB L3 share

## L2 — Inside one Skymont E-cluster

5 sub-blocks:

1. **4× Skymont cores** (instance 4)
   - Each: 9-wide decode (3 clusters × 3-wide), 96 µop queue
   - 416-entry ROB
   - 26 dispatch ports (8 ALU + 3 JMP + 3 LD + 12 others)
   - 4×128-bit FP pipes
   - 7 AGUs (3 load + 4 store)
   - L1D (4-cycle latency)
2. **Shared 4 MB L2 cache** (per cluster)
3. **8 MB Memory-Side Cache** (shared, 59.5 ns latency)
4. **Cluster interconnect to L3 ring**

## L2 — Inside the GPU tile (Xe-LPG, ARL-S desktop)

1 render slice × 4 Xe-cores × 16 EUs each = 64 EUs total.

```
GPU Tile (Render Slice)
├── Xe-core 0 → 16 EUs (instance)
├── Xe-core 1 → 16 EUs (instance)
├── Xe-core 2 → 16 EUs (instance)
└── Xe-core 3 → 16 EUs (instance)
+ 192 KB L1 per slice
```

64 EUs is below the 100-instance threshold → drei `<Instances>` is fine.

(Note: ARL-H mobile gets Xe-LPG+ with 8 Xe-cores + XMX + 8 RT units — not relevant for 285K desktop.)

## L2 — Inside the SoC tile

6 sub-blocks:

- **NPU 3 (NPU 3720)** — 13 TOPS INT8
  - 2 Neural Compute Engines (NCE)
  - Each NCE: 2K INT8/FP16 MACs + 2 Movidius SHAVE DSPs
  - 4 MB scratchpad RAM
  - Boost to 1600 MHz
- **IMC** — DDR5, 2 channels (MC0 + MC1, matches `UNC_MC0_*` and `UNC_MC1_*` events)
- **Media engine**
- **Display engines** (multiple)
- **IPU** (Image Processing Unit)
- **LP-island** (low-power E-cores — only on ARL-H mobile; absent on 285K desktop)

## L2 — Inside the I/O tile

3 sub-blocks:
- **Thunderbolt 4 controller** + TBT4 PHY
- **PCIe 5.0 PHY** + buffers
- **Display PHY**

## L3+ — Uncore overlay (fabric layer beneath tiles)

These are distributed across the die, not single physical blocks. Render as a **translucent fabric layer** beneath the compute + memory regions:

- **LLC ring** — `UNC_HAC_CBO_TOR_ALLOCATION.*` events
- **HAC arbitration** — `UNC_HAC_ARB_TRK_REQUESTS.*`, `UNC_HAC_ARB_TRANSACTIONS.*`
- **iMC** — `UNC_M_CAS_COUNT_*`, `UNC_M_ACT_COUNT_*`, `UNC_MC0/1_*`
- **NCU** — `UNC_CLOCK.SOCKET` (UCLK fixed counter)
- **Power planes** — PKG, PP0 (core domain), PP1 (uncore/graphics)

Total uncore events: **24** (per `intel/perfmon/ARL/events/arrowlake_uncore.json`) — vastly smaller than Xeon-class uncore. Good news for our 3D — shallow leaf count.

## L6+ — 2D handoff

For cache way layouts, register file slots, FU scheduler timings — **hand off to SVG** via drei `<Html transform>`. These are intrinsically 2D and 3D obscures them. Per MD §10 "Bail-out plan" — also more accessible.

## Implementation hints for `chip-spec.ts`

- Use `instanceOf: 'lane-template', count: N` for repeated leaves (decode lanes, EUs, MACs)
- IDs are dotted paths matching `BlockId` (e.g. `compute.p-core-0.frontend.decode.lane-3`)
- The 4 L0 plates sit at `y = 4.0, 2.5, 1.0, -0.5` (matches MD §3 example)
- Tile width/depth roughly proportional to die area (with the 25% min-width cap)
- Starter spec at `assets/chip-spec.example.ts`

## Sources

All block counts verified against:
- `intel/perfmon/ARL/events/arrowlake_uncore.json` (uncore PMUs)
- User's EMON xlsx (P-core and E-cluster module numbering — confirms 285K topology)
- Wikipedia "Arrow Lake (microprocessor)"
- chipsandcheese.com Skymont deep-dive
- MD §3 Lion Cove specifics

**Do not extend this taxonomy without source verification.** Block counts here drive `chip-spec.ts`; making up extras pollutes the visualization. If something feels missing, check `F:\Raptor-K-E\phase-0-findings.md` first.
