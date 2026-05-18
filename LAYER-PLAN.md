# LAYER-PLAN.md — Arrow Lake (Core Ultra 9 285K / 270K+) 3D Drill Hierarchy

**Authoritative layer-by-layer floorplan for the raptor-tma 3D scene.**

This file is the single source of truth for what gets rendered at each drill level.
Cross-referenced against:
- [Chips and Cheese — Examining Intel's Arrow Lake at the System Level](https://chipsandcheese.com/p/examining-intels-arrow-lake-at-the)
- [Chips and Cheese — Lion Cove deep dive](https://chipsandcheese.com/p/lion-cove-intels-p-core-roars)
- [Chips and Cheese — Skymont](https://old.chipsandcheese.com/2024/10/03/skymont-intels-e-cores-reach-for-the-sky/)
- [Intel Tech Tour 2024 — Lion Cove Architecture (PDF)](https://cdrdv2-public.intel.com/824430/2024_Intel_Tech%20Tour%20TW_Next%20Gen%20P-core%20The%20Lion%20Cove%20Architecture-4.pdf)
- [TechPowerUp — Asus annotated 285K die shot](https://www.techpowerup.com/336412/inside-arrow-lake-intels-die-exposed-and-annotated)
- [Tom's Hardware — Asus 285K die shot annotations](https://www.tomshardware.com/pc-components/cpus/asus-shares-official-die-shots-of-the-core-ultra-9-285k-in-depth-annotations-break-down-intels-disaggregated-approach)
- [Wikipedia — Arrow Lake (microprocessor)](https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor))
- [wccftech — Arrow Lake four-tile architecture](https://wccftech.com/intel-arrow-lake-cpu-architecture-four-tiles-cpu-tile-coherent-fabric-connecting-p-cores-e-cores/)
- [Intel EDC — Core Ultra 200S Datasheet Vol 1](https://edc.intel.com/content/www/us/en/design/products/platforms/details/arrow-lake-s/core-ultra-200s-series-processors-datasheet-volume-1-of-2/005/)
- [SkatterBencher — ARL NPU + D2D overclocking](https://skatterbencher.com/2024/10/24/arrow-lake-npu-overclocking/)

## Coordinate system

```
Y = up (elevation off the substrate, where drill layers stack)
X = right
Z = front (positive Z toward camera)
```

`Y_REST = 0.35` (chiplet sitting on base), `LIFT_AMOUNT = 2.0` (hover lift),
`DRILL_GAP = ~2.0` per level. Base tile centered at origin (0, 0, 0).

---

## Side view — Y-stacking as drill goes deeper

```
Y
 8 ─                                                  ┌──────────────┐  L4 leaves
 7 ─                                                  │ decode×8     │  (deepest)
 6 ─                                  ┌───────────────┴──────────────┘
 5 ─                                  │  Front End (Lion Cove)        │  L3
 4 ─                  ┌───────────────┴───────────────────────────────┘
 3 ─                  │  P-core 0 anatomy: FE / OoO / Exec / Memory   │  L2
 2 ─    ┌─────────────┴──────────────────────────────────────────────┘
 1 ─    │  P-cores ×8 + E-clusters ×4 + 12 × L3 slices (Compute Tile)│  L1
 0 ─────┴────────────────────────────────────────────────────────────  L0 + BaseTile
       ▒▒▒▒▒ Base Tile (Intel 22FFL active interposer) ▒▒▒▒▒
        cyan rim glow leaking from below ↓↓↓↓↓
```

Parent layers stay visible as wireframe `<Edges>` ghosts at opacity 0.15. Sibling
chiplets at depth N drop to opacity 0.08.

---

## L0 — Physical die-shot floorplan (the authoritative L0)

Per TechPowerUp/Asus annotated 285K die shot, the **physical** layout is a 4-quadrant grid. This is what we render, NOT the logical Tech-Tour block diagram (which has CPU/IOE-top + SoC-middle + GPU-bottom — that's topological, not physical).

```
        ←──────────── BASE_W = 16 ────────────→
       ┌──────────────────┬──────────────────┐  ↑
       │                  │                  │  │
       │  COMPUTE TILE    │   GPU TILE       │  │
       │  (top-left)      │   (top-right)    │  │   top half
       │  TSMC N3B        │   TSMC N5(P)     │  │   Z = -3
       │  117 mm²         │   23 mm²         │  │   depth 6
       │  P+E cores       │   Xe-LPG         │  │
       │                  │                  │  │
       ├──────────────────┼──────────────────┤  ─  Z = 0
       │                  │                  │  │
       │  IOE TILE        │   SoC TILE       │  │
       │  (bottom-left)   │   (bottom-right) │  │   bottom half
       │  TSMC N6         │   TSMC N6        │  │   Z = +3
       │  24 mm²          │   87 mm²         │  │   depth 6
       │  TBT4 / PCIe     │   NPU/MC/Display │  │
       │                  │                  │  │
       └──────────────────┴──────────────────┘  ↓
         all at Y_REST = 0.35 on Base Tile (Y = 0)
       ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
       ▒  BASE TILE — Intel 22FFL active interposer  ▒
       ▒  (passive-looking but has FDI links + power) ▒
       ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
```

**Per user direction**: actual mm² areas are not preserved visually — placement matters,
not relative size. We use a balanced 4-quadrant grid where all tiles have roughly equal
visible footprint so each is hover-targetable.

**Optional**: 2 structural filler tiles also exist on the package for mechanical
integrity. We do NOT render them — they have no PMU and no architectural role.

---

## L1 — COMPUTE TILE (top-left quadrant)

Process: TSMC N3B. Area: 117.241 mm². 8 P + 16 E = 24 cores. Single LLC ring bus.

```
L1 — Compute Tile drill-down (after click on Compute at L0)
Ring topology with 13 stops (12 LLC slices + 1 cross-die D2D stop)

      ┌─────────────────────────────────────────────────────────┐
ring→ │  ┌────┐  ┌──────┐  ┌────┐  ┌────┐  ┌──────┐  ┌────┐    │
      │  │ P0 │──│ E-cl │──│ P1 │──│ P4 │──│ E-cl │──│ P5 │    │
      │  │Lion│  │mod 2 │  │Lion│  │Lion│  │mod 3 │  │Lion│    │
      │  │Cove│  │ S×4  │  │Cove│  │Cove│  │ S×4  │  │Cove│    │
      │  └────┘  └──────┘  └────┘  └────┘  └──────┘  └────┘    │
      │  ┌────┐  ┌──────┐  ┌────┐  ┌────┐  ┌──────┐  ┌────┐    │
      │  │ P6 │──│ E-cl │──│ P7 │──│ P10│──│ E-cl │──│ P11│    │
      │  │Lion│  │mod 8 │  │Lion│  │Lion│  │mod 9 │  │Lion│    │
      │  │Cove│  │ S×4  │  │Cove│  │Cove│  │ S×4  │  │Cove│    │
      │  └────┘  └──────┘  └────┘  └────┘  └──────┘  └────┘    │
      │   ╔══════════════════════════════════════════════════╗  │
      │   ║ Ring Bus + 12 × LLC slice (CBO) = 36 MB L3        ║  │
      │   ║ + 1 cross-die D2D stop → SoC tile (H-IDI link)    ║  │
      │   ╚══════════════════════════════════════════════════╝  │
      └─────────────────────────────────────────────────────────┘
```

- **8 Lion Cove P-cores** at EMON module IDs `0, 1, 4, 5, 6, 7, 10, 11`
- **4 Skymont E-clusters** at module IDs `2, 3, 8, 9` (each cluster = 4 Skymont cores, so 16 E-cores total)
- **L3 ring bus**: 12 LLC slices × 3 MB = **36 MB shared L3**. ARL Skymont cores tap L3 for the first time (no MSC on desktop).
- **Cross-die stop**: 13th ring stop bridges to SoC tile via H-IDI D2D.

### L2 — Lion Cove P-core (4 sub-blocks)

```
        ┌──────────────────────┐  ┌──────────────────────┐
        │  Front End           │  │  Out-of-Order        │
        │  8-wide decode       │  │  576 ROB (split      │
        │                      │  │  INT / VEC domains)  │
        └──────────────────────┘  └──────────────────────┘
        ┌──────────────────────┐  ┌──────────────────────┐
        │  Execution Ports     │  │  Memory Subsystem    │
        │  ~18 ports total     │  │  L0D 48K / L1D 192K  │
        │  4 INT ALU + 4 VEC   │  │  L2 3M private       │
        │  3 STA + LD/JMP      │  │  L3 3M slice on ring │
        └──────────────────────┘  └──────────────────────┘
```

### L3 — Lion Cove Front End (5 sub-blocks)

```
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Branch  │→ │  Fetch   │→ │  Decode  │  ← 8 lanes (instanced ×8)
        │  Predict │  │ (L1I 64K)│  │  8-wide  │
        └──────────┘  └──────────┘  └────┬─────┘
                                         ↓
                              ┌──────────────────┐
                              │  µop Cache       │
                              │  5,250 entries   │
                              └────────┬─────────┘
                                       ↓
                              ┌──────────────────┐
                              │  µop Queue       │
                              │  192 entries     │
                              └──────────────────┘
```

### L4 — Decode lanes (the deepest drill, Lion Cove)

```
   ┌───┬───┬───┬───┬───┬───┬───┬───┐
   │D0 │D1 │D2 │D3 │D4 │D5 │D6 │D7 │   8 parallel decode lanes
   └───┴───┴───┴───┴───┴───┴───┴───┘    (instanceOf: 'decode.lane', count: 8)
```

### L2 — Skymont E-cluster (NO MSC — Lunar Lake-only)

```
        ┌─────────────┐ ┌─────────────┐
        │ Skymont 0   │ │ Skymont 1   │   each: 9-wide clustered decode,
        │ 9-wide 3×3  │ │ 9-wide 3×3  │         416 ROB, 26 dispatch ports
        └─────────────┘ └─────────────┘
        ┌─────────────┐ ┌─────────────┐
        │ Skymont 2   │ │ Skymont 3   │   8 INT ALU + 3 JMP +
        │             │ │             │   FP/VEC quad-pipe + 7 AGU
        └─────────────┘ └─────────────┘
              ┌──────────────────────┐
              │  Shared 4 MB L2      │   128 B/cyc bandwidth
              │  (per-cluster)       │
              └──────────────────────┘
              ┌──────────────────────┐
              │  Ring stop → 36 MB   │   E-cores tap L3 for first time on ARL
              │  L3 (no MSC on 285K) │
              └──────────────────────┘
```

---

## L1 — GPU TILE (top-right quadrant)

Process: TSMC N5(P). Area: 23 mm². Single render slice with 4 Xe-cores.

```
L1 — GPU Tile floorplan
+----------------------------------------------------+
|  [GPU D2D → SoC]   (CXL-based die-to-die link)     |
|                                                    |
|  ┌──────────────────────────────────────────────┐  |
|  │           RENDER SLICE 0 (only one)          │  |
|  │                                              │  |
|  │  ┌─────────────┐  ┌───────────────────────┐  │  |
|  │  │ Geometry    │  │ Rasterizer + Hier-Z   │  │  |
|  │  │ Frontend    │  │ 2 Pixel Backends (ROP)│  │  |
|  │  └─────────────┘  └───────────────────────┘  │  |
|  │                                              │  |
|  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │  |
|  │  │Xe-c0 │ │Xe-c1 │ │Xe-c2 │ │Xe-c3 │         │  |
|  │  └──────┘ └──────┘ └──────┘ └──────┘         │  |
|  │  4 × Sampler  +  4 × RT Unit (per Xe-core)   │  |
|  └──────────────────────────────────────────────┘  |
|  (No dedicated GPU L2 on ARL-S — misses to SoC)    |
|  (Display + Media engines live on SoC tile)        |
+----------------------------------------------------+
```

### L2 — Render Slice

Per-slice (ARL-S has 1 slice):
- 1 Geometry Frontend
- 1 Rasterizer + Hierarchical-Z
- 2 Pixel Backends (ROPs)
- 4 Xe-cores
- 4 Samplers (1 per Xe-core)
- 4 RT Units (1 per Xe-core)

### L3 — Xe-core (16 Vector Engines + L1, NO XMX on desktop)

```
        ┌──────────────────────────────────────┐
        │  192 KB L1$ / SLM (unified, partit.) │
        │  (160 KB L1 max if no SLM allocated) │
        └──────────────────────────────────────┘
        ┌────┐ ┌────┐ ┌────┐ ┌────┐
        │VE 0│ │VE 1│ │VE 2│ │VE 3│   16 Vector Engines per Xe-core
        ├────┤ ├────┤ ├────┤ ├────┤    (formerly "EU"; Intel renamed)
        │VE 4│ │VE 5│ │VE 6│ │VE 7│
        ├────┤ ├────┤ ├────┤ ├────┤
        │VE 8│ │VE 9│ │VE10│ │VE11│
        ├────┤ ├────┤ ├────┤ ├────┤
        │VE12│ │VE13│ │VE14│ │VE15│
        └────┘ └────┘ └────┘ └────┘
        ┌─────────┐ ┌─────────┐ ┌──────────────┐
        │ Sampler │ │ RT Unit │ │ Thread Disp. │
        └─────────┘ └─────────┘ └──────────────┘
        (NO XMX matrix engine — desktop Xe-LPG only)
```

### L4 — Vector Engine (deepest GPU drill)

```
   ┌──────────────────────────────────┐
   │  8-wide SIMD FP/INT pipe         │
   ├──────────────────────────────────┤
   │  8-wide parallel INT pipe        │
   ├──────────────────────────────────┤
   │  Thread control + register file  │
   └──────────────────────────────────┘
   (No XMX systolic array on ARL-S)
```

---

## L1 — SoC TILE (bottom-right quadrant)

Process: TSMC N6. Area: 86.648 mm². Houses NPU, IMC, fabric, media, display, security.

```
L1 — SoC Tile floorplan
+------------------------------------------------------------+
| [CPU D2D ← Compute (H-IDI)]      [GPU D2D ← GPU (CXL)]     |
|                                                            |
|  ┌──────────────┐    ┌──────────────────────────────────┐  |
|  │ AI Complex   │    │ Coherent Fabric                  │  |
|  │ (NPU 3720)   │←──→│ (ring/mesh — glues all blocks)   │  |
|  │ ~13 TOPS     │    └──────────────────────────────────┘  |
|  └──────────────┘             ↑              ↑             |
|                               │              │             |
|  ┌──────────────┐  ┌──────────┴───┐  ┌───────┴──────────┐  |
|  │ Display      │  │ Media        │  │ Security Complex │  |
|  │ Complex      │  │ Complex      │  │ (CSE)            │  |
|  │ (eDP/DP/HDMI)│  │ (enc/dec)    │  │                  │  |
|  └──────────────┘  └──────────────┘  └──────────────────┘  |
|                                                            |
|  ┌──────────────────────────────┐  ┌────────────────────┐  |
|  │ Memory Fabric                │  │ Power Manager      │  |
|  └──────────────┬───────────────┘  └────────────────────┘  |
|                 ↓                                          |
|  ┌──────────────────────────────┐  ┌────────────────────┐  |
|  │ Integrated Memory Controller │  │ DMI / PCIe5 x16 /  │  |
|  │ (IMC) — DDR5-6400 native     │  │ eSPI (PCIe to GPU) │  |
|  └──────────────────────────────┘  └────────────────────┘  |
|                                                            |
| [IOE D2D → IOE tile]                                       |
+------------------------------------------------------------+
NOTE: NO IPU on desktop 285K/270K (mobile-only block).
NOTE: NO LP E-cores (LP-island deleted on ARL-S desktop).
```

### L2 — NPU 3720 (Gen-3, Meteor Lake carryover, NOT new)

```
        ┌────────────────────────────────────────────┐
        │ NPU 3720 (AI Complex)                      │
        │                                            │
        │  ┌──────────────────┐ ┌──────────────────┐ │
        │  │ NCE 0            │ │ NCE 1            │ │
        │  │ - 2K MAC array   │ │ - 2K MAC array   │ │
        │  │ - SHAVE DSP 0    │ │ - SHAVE DSP 2    │ │
        │  │ - SHAVE DSP 1    │ │ - SHAVE DSP 3    │ │
        │  │ ~4 TOPS @ 1 GHz  │ │ ~4 TOPS @ 1 GHz  │ │
        │  └────────┬─────────┘ └────────┬─────────┘ │
        │           ↓                    ↓           │
        │  ┌──────────────────────────────────────┐  │
        │  │  4 MB Scratchpad SRAM (shared)       │  │
        │  └──────────────────────────────────────┘  │
        │  ┌──────────────────────────────────────┐  │
        │  │  DMA / NoC bridge → Coherent Fabric  │  │
        │  └──────────────────────────────────────┘  │
        │  Boost ~1.4–1.6 GHz → ~13 TOPS aggregate   │
        └────────────────────────────────────────────┘
```

### L2 — IMC (kept shallow)

```
        ┌─────────────────────────────────────┐
        │ Integrated Memory Controller (IMC)  │
        │  ┌─────────┐ ┌─────────┐            │
        │  │ MC ch.A │ │ MC ch.B │ (2 chan)   │
        │  └─────────┘ └─────────┘            │
        │  - DDR5-6400 native                 │
        │  - Up to DDR5-8000+ via CU-DIMM OC  │
        │  - LPDDR5X-8533 on mobile (not us)  │
        └─────────────────────────────────────┘
```

Other L2s (Coherent Fabric, Memory Fabric, Display Complex, Media Complex,
Security Complex, Power Manager, DMI/PCIe cluster): kept as **leaf blocks**
at L2. No useful further drill-down for TMA purposes.

---

## L1 — IOE TILE (bottom-left quadrant)

Process: TSMC N6. Area: 24.475 mm². Smallest tile. TBT/USB4 + PCIe for SSDs.

```
L1 — IOE Tile floorplan
+---------------------------------------------------+
|  ┌──────────────────────────────────────────────┐ |
|  │ Thunderbolt 4 / USB4 Complex                 │ |
|  │  ┌────────────────────┐                      │ |
|  │  │ TBT4 Controller    │ (single, 40 Gbps)    │ |
|  │  └────────────────────┘                      │ |
|  │  ┌─────────┐ ┌─────────┐                     │ |
|  │  │ USB4 PHY│ │ USB4 PHY│ (2× USB-C ports)    │ |
|  │  └─────────┘ └─────────┘                     │ |
|  │  ┌─────────┐ ┌─────────┐                     │ |
|  │  │ DP PHY  │ │ DP PHY  │ (DP-alt via USB-C)  │ |
|  │  └─────────┘ └─────────┘                     │ |
|  └──────────────────────────────────────────────┘ |
|                                                   |
|  ┌──────────────────────────────────────────────┐ |
|  │ PCIe PHY Cluster (for M.2 SSDs only)         │ |
|  │  ┌────────────────────┐                      │ |
|  │  │ PCIe 5.0 x4 PHY    │ (M.2 #1, primary)    │ |
|  │  └────────────────────┘                      │ |
|  │  ┌────────────────────┐                      │ |
|  │  │ PCIe 4.0 x4 PHY    │ (M.2 #2 / chipset)   │ |
|  │  └────────────────────┘                      │ |
|  └──────────────────────────────────────────────┘ |
|                                                   |
|  ┌──────────────────────────────────────────────┐ |
|  │ IOE D2D / FDI Bridge → Base Tile             │ |
|  └──────────────────────────────────────────────┘ |
+---------------------------------------------------+
NOTE: GPU PCIe5 x16 link is on SoC tile, NOT IOE.
NOTE: USB 2.0/3.x, audio (HDA), primary DP engines = SoC tile.
```

L2: TBT4 / USB4 complex, PCIe PHY cluster, D2D bridge — leaf-level on IOE.

---

## Drill choreography (camera + opacity)

When user clicks a block at depth N:

1. `pushFocus(blockId)` updates Zustand store and Breadcrumb.
2. New layer of children mounts at `Y = previousLayerY + DRILL_GAP (≈2.0)`.
3. New layer's children stagger-reveal scale `0.9 → 1.0` with 30 ms per child.
4. `cameraControls.fitToBox(newLayerBox, true, {paddingTop:0.2, paddingBottom:0.2})` dollies.
5. Sibling blocks at the parent's depth fade to opacity `0.08` (still visible, faded).
6. The parent block becomes a wireframe `<Edges>` ghost at opacity `0.15` (spatial memory).
7. `Esc` pops one level, reverses fitToBox via the same Promise.

---

## Things that are NOT in the layer plan (call out for future contributors)

- **MSC (Memory-Side Cache)**: Lunar Lake-only. Do NOT add to Skymont clusters.
- **IPU (Image Processing Unit)**: Mobile-only. Do NOT add to desktop SoC tile.
- **LP E-cores / LP-island**: Mobile-only. Do NOT add to desktop SoC tile.
- **XMX matrix engine**: Mobile-only (ARL-H Xe-LPG+). Do NOT add to desktop GPU tile.
- **GPU L2**: Mobile-only (ARL-H). Desktop misses go to SoC fabric.
- **Display engine on GPU tile**: It's on SoC, not GPU.
- **PCIe5 x16 GPU link on IOE**: It's on SoC, not IOE.
- **2 structural filler tiles**: Real but mechanical-only — no PMU. Skip.
- **"NPU 3" as next-gen**: It's NPU 3720, Meteor Lake carryover. Same NPU as MTL.
- **"HAC" L3 ring**: Not Intel terminology. The structure is a standard ring + 12 LLC slices (CBO per slice).

---

## Consolidated all-layer diff (what changed from initial draft → researched final)

Snapshot of every layer with `◀ was: X` annotations marking corrections applied
after the 4-agent research pass (2026-05-18). If a future contributor wants to
know "did this fact survive research?", consult this view.

### L0 — base + 4 chiplets (PHYSICAL die-shot, 4-quadrant)
```
┌──────────────────┬──────────────────┐
│ COMPUTE (TL)     │   GPU (TR)       │   ▲ was: IOE-top + SoC-middle
│ N3B, 117 mm²     │   N5, 23 mm²     │     + GPU-bottom logical bands
├──────────────────┼──────────────────┤   ▲ now: physical die-shot grid
│ IOE (BL)         │   SoC (BR)       │
│ N6, 24 mm²       │   N6, 87 mm²     │
└──────────────────┴──────────────────┘
        on Base Tile (16×12, Y=0)
```

### L1 — COMPUTE drill (Ring + 12 LLC slices, no HAC mesh)
```
┌─────────────────────────────────────────────────────┐
│ ┌──┐ ┌──────┐ ┌──┐ ┌──┐ ┌──────┐ ┌──┐               │
│ │P0│-│E mod2│-│P1│-│P4│-│E mod3│-│P5│  ← ring bus   │
│ └──┘ └──────┘ └──┘ └──┘ └──────┘ └──┘    (13 stops) │
│ ┌──┐ ┌──────┐ ┌──┐ ┌──┐ ┌──────┐ ┌──┐               │
│ │P6│-│E mod8│-│P7│-│P10│-│E mod9│-│P11│              │
│ └──┘ └──────┘ └──┘ └──┘ └──────┘ └──┘               │
│  ═════ Ring Bus + 12 × 3 MB LLC = 36 MB ═════       │  ◀ was: "L3 Ring (HAC)"
└─────────────────────────────────────────────────────┘
   8 P + 16 E = 24 cores total
```

### L1 — GPU drill (fixed-function added, no L2, no XMX, no display)
```
┌──────────────────────────────────────────────┐
│  Render Slice (only 1 on ARL-S desktop)      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐  │  ◀ NEW: geometry + raster + ROP
│  │ Geometry │ │ Rasterizer + │ │ 2× ROP   │  │     (were missing before)
│  │ Frontend │ │ Hier-Z       │ │          │  │
│  └──────────┘ └──────────────┘ └──────────┘  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │Xe-c│ │Xe-c│ │Xe-c│ │Xe-c│  (16 VE each)   │  ◀ EU renamed to VE
│  │ 0  │ │ 1  │ │ 2  │ │ 3  │                 │     each w/ own 192KB L1
│  └────┘ └────┘ └────┘ └────┘                 │
│  (no GPU L2 - misses → SoC fabric)           │  ◀ was: "192 KB L1 per slice"
│  (no XMX - desktop Xe-LPG only)              │
└──────────────────────────────────────────────┘
```

### L1 — SOC drill (7 new blocks + 3 D2D edges + NPU rename)
```
┌──────────────────────────────────────────────────────┐
│ [CPU D2D-H-IDI]                  [GPU D2D-CXL]       │  ◀ NEW: 3 D2D edges
│                                                      │
│ ┌─AI Complex─┐  ┌─Coherent Fabric (ring/mesh)─────┐  │  ◀ Coherent Fabric NEW
│ │ NPU 3720   │  └────────────────────────────────┘  │  ◀ "NPU 3" → "NPU 3720"
│ │ ~13 TOPS   │                                       │     (Gen-3 MTL carryover)
│ │ 2 NCE+SRAM │                                       │
│ └────────────┘                                       │
│ ┌─Display───┐ ┌─Media────┐ ┌─Security─┐ ┌─Power──┐  │  ◀ Display Complex
│ │ Complex   │ │ Complex  │ │ Complex  │ │ Mgr    │  │  ◀ Media Complex
│ └───────────┘ └──────────┘ └──────────┘ └────────┘  │  ◀ Security NEW
│                                                      │  ◀ Power Mgr NEW
│ ┌─Memory Fabric──┐  ┌─IMC (DDR5-6400)──────────────┐ │  ◀ Memory Fabric NEW
│ └────────────────┘  └──────────────────────────────┘ │
│ ┌─DMI / PCIe5 x16 / eSPI──┐                          │  ◀ PCIe x16 NEW (was IOE)
│ └─────────────────────────┘                          │
│ [IOE D2D]                                            │  ◀ (no IPU — mobile-only)
└──────────────────────────────────────────────────────┘
```

### L1 — IOE drill (mostly correct, scoped down)
```
┌──────────────────────────────────────┐
│ ┌─TBT4/USB4 Complex──┐               │
│ │ 1 controller       │               │
│ │ 2 USB-C / DP-alt   │               │
│ └────────────────────┘               │
│ ┌─PCIe PHY (M.2 only)┐               │  ◀ PCIe x16 moved to SoC
│ │ x4 Gen5 + x4 Gen4  │               │
│ └────────────────────┘               │
│ [IOE D2D / FDI bridge]               │
└──────────────────────────────────────┘
```

### L2 — Lion Cove P-core (4 blocks — unchanged, was already right)
```
┌──Front End──┐  ┌──Out-of-Order───┐
│ 8-wide      │  │ 576 ROB         │
└─────────────┘  └─────────────────┘
┌──Exec Ports─┐  ┌──Memory─────────┐
│ 18 ports    │  │ L0D 48K L1 192K │
└─────────────┘  │ L2 3M L3 3M slice│
                 └─────────────────┘
```

### L2 — Skymont E-cluster (MSC REMOVED)
```
┌─S0─┐ ┌─S1─┐ ┌─S2─┐ ┌─S3─┐         each: 9-wide 3×3
└────┘ └────┘ └────┘ └────┘         416 ROB, 26 ports
┌─Shared 4 MB L2 (128 B/cyc)─┐
└────────────────────────────┘
   → ring stop → 36 MB L3                  ◀ was: + 8 MB MSC ❌ DELETED
```

### L3 — Lion Cove Front End (5 blocks — unchanged)
```
[BPU] → [Fetch L1I 64K] → [Decode ×8] → [µop$ 5.25K] → [µop Q 192]
```

### L3 — Xe-core (XMX removed)
```
┌─16 Vector Engines (VEs) in 4×4 grid─┐
│ + 1 Sampler + 1 RT Unit             │     ◀ was: + XMX ❌ DELETED
│ + 192 KB L1/SLM (per Xe-core)       │     ◀ was: per-slice
└─────────────────────────────────────┘
```

### L4 — Decode lanes / Vector engines (leaves)
```
Decode: [D0][D1][D2][D3][D4][D5][D6][D7]   (8-wide)

Vector Engine internals (NEW L4 for GPU drill):
  ┌─8-wide SIMD FP/INT pipe──┐
  ┌─8-wide parallel INT pipe─┐
  ┌─Thread ctrl + reg file──┐
  (no XMX systolic array)
```

---

## Per-level acceptance test

For a drill to be considered correct at depth N, you should be able to:

1. Click a chiplet → new layer rises at Y + 2.0 above the previous top
2. Camera smoothly dollies via fitToBox to frame the new layer
3. Siblings at depth N-1 visibly dim (opacity 0.08)
4. Parent at depth N-1 becomes wireframe ghost
5. Breadcrumb reads correctly: `Arrow Lake › Compute Tile › P-core 0 › Front End › Decode`
6. Esc reverses to the prior depth
7. Frame budget stays ≤ 16 ms (60 fps on RTX 4090 workstation)
