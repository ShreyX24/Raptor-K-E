/**
 * chip-spec.example.ts — starter taxonomy for the ARL 285K die.
 *
 * Copy to src/data/chip-spec.ts and extend.
 * Block counts verified per references/chip-taxonomy.md.
 *
 * Coordinate system:
 *   y = stacking axis (tiles float vertically at different y values)
 *   width/depth = floor footprint
 *   height = tile thickness
 *
 * The 4 tile plates sit at y = 4.0, 2.5, 1.0, -0.5 — matches the MD §3 example
 * scaled for the whole-die multi-tile layout.
 */
export interface BlockSpec {
  id: string
  label: string
  width: number
  depth: number
  height: number
  color?: string
  children?: BlockSpec[]
  instanceOf?: string
  count?: number
  /**
   * Layout strategy for the children's positions inside this block's footprint.
   *   - 'auto' (default): packChildren grid-packs N children into ceil(sqrt(N)) cols.
   *   - 'manual': each child must supply `localX`/`localZ` (relative to parent
   *     center) and width/depth are used verbatim. Required for tiles whose
   *     real floorplan differs sharply from a grid — e.g. the Compute Tile
   *     has 2 core rows around a horizontal ring agent strip.
   */
  layout?: 'auto' | 'manual'
  /** Manual-layout only: child center X offset from parent center. */
  localX?: number
  /** Manual-layout only: child center Z offset from parent center. */
  localZ?: number
}

// L0 root — Arrow Lake 285K whole die
export const chipSpec: BlockSpec = {
  id: 'arl-285k',
  label: 'Arrow Lake — Core Ultra 9 285K',
  width: 14,
  depth: 14,
  height: 0.4,
  children: [
    // ----- COMPUTE TILE -----
    // Floorplan matches the annotated 285K die shot:
    //   F:\Raptor-K-E\reference images\die cpu tile - high-yield-arrow-lake-5_1920px.png
    //
    //   Top edge:    P#1  E#1  P#3  P#5  E#3  P#7      ← 6 ring stops, north row
    //   Top L3 row:  S1   S2   S3   S4   S5   S6        ← 6 LLC slices × 3 MB
    //   Mid strip:   Ring Agent + L3 Cache Tags          ← horizontal HAC strip
    //   Bot L3 row:  S7   S8   S9   S10  S11  S12       ← 6 LLC slices × 3 MB
    //   Bot edge:    P#2  E#2  P#4  P#6  E#4  P#8      ← 6 ring stops, south row
    //
    //   8 P-cores (Lion Cove) numbered 1-8 per Intel marketing.
    //   4 E-clusters numbered 1-4 (each = 4 Skymont cores + shared L2).
    //   12 LLC slices × 3 MB (2× 1.5 MB) = 36 MB total L3.
    //   Ring topology: 12 core stops + 1 D2D stop to SoC tile.
    //
    // Compute tile L0 footprint = 7 wide × 5 deep. Children use layout: 'manual'
    // with explicit localX/localZ for each block to match the die shot exactly.
    //
    // Column X centers (6 cols across width 7):
    //   c0=-2.92  c1=-1.75  c2=-0.58  c3=+0.58  c4=+1.75  c5=+2.92
    // Row Z centers (5 bands across depth 5):
    //   row-top-cores   z=-1.9   depth 1.2
    //   row-top-l3      z=-0.95  depth 0.7
    //   row-ring        z= 0     depth 1.2
    //   row-bot-l3      z=+0.95  depth 0.7
    //   row-bot-cores   z=+1.9   depth 1.2
    {
      id: 'compute',
      label: 'Compute Tile · TSMC N3B · 117 mm²',
      width: 7,
      depth: 5,
      height: 0.6,
      layout: 'manual',
      children: [
        // ─── TOP CORE ROW (north edge) ───────────────────────────────
        { id: 'compute.p1', label: 'P-core #1 · Lion Cove', localX: -2.92, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p1') },
        { id: 'compute.e1', label: 'E-cluster #1 · 4× Skymont', localX: -1.75, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e1') },
        { id: 'compute.p3', label: 'P-core #3 · Lion Cove', localX: -0.58, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p3') },
        { id: 'compute.p5', label: 'P-core #5 · Lion Cove', localX:  0.58, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p5') },
        { id: 'compute.e3', label: 'E-cluster #3 · 4× Skymont', localX:  1.75, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e3') },
        { id: 'compute.p7', label: 'P-core #7 · Lion Cove', localX:  2.92, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p7') },

        // ─── TOP L3 SLICE ROW ────────────────────────────────────────
        { id: 'compute.l3-s1',  label: 'L3 Slice #1 · 3 MB',  localX: -2.92, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s2',  label: 'L3 Slice #2 · 3 MB',  localX: -1.75, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s3',  label: 'L3 Slice #3 · 3 MB',  localX: -0.58, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s4',  label: 'L3 Slice #4 · 3 MB',  localX:  0.58, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s5',  label: 'L3 Slice #5 · 3 MB',  localX:  1.75, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s6',  label: 'L3 Slice #6 · 3 MB',  localX:  2.92, localZ: -0.95, width: 1.05, depth: 0.6, height: 0.15 },

        // ─── RING AGENT STRIP (HAC + L3 cache tags) ─────────────────
        { id: 'compute.ring-agent', label: 'Ring Agent + L3 Cache Tags', localX: 0, localZ: 0, width: 6.8, depth: 1.0, height: 0.18 },

        // ─── BOTTOM L3 SLICE ROW ─────────────────────────────────────
        { id: 'compute.l3-s7',  label: 'L3 Slice #7 · 3 MB',  localX: -2.92, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s8',  label: 'L3 Slice #8 · 3 MB',  localX: -1.75, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s9',  label: 'L3 Slice #9 · 3 MB',  localX: -0.58, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s10', label: 'L3 Slice #10 · 3 MB', localX:  0.58, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s11', label: 'L3 Slice #11 · 3 MB', localX:  1.75, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },
        { id: 'compute.l3-s12', label: 'L3 Slice #12 · 3 MB', localX:  2.92, localZ:  0.95, width: 1.05, depth: 0.6, height: 0.15 },

        // ─── BOTTOM CORE ROW (south edge) ────────────────────────────
        { id: 'compute.p2', label: 'P-core #2 · Lion Cove', localX: -2.92, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p2') },
        { id: 'compute.e2', label: 'E-cluster #2 · 4× Skymont', localX: -1.75, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e2') },
        { id: 'compute.p4', label: 'P-core #4 · Lion Cove', localX: -0.58, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p4') },
        { id: 'compute.p6', label: 'P-core #6 · Lion Cove', localX:  0.58, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p6') },
        { id: 'compute.e4', label: 'E-cluster #4 · 4× Skymont', localX:  1.75, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e4') },
        { id: 'compute.p8', label: 'P-core #8 · Lion Cove', localX:  2.92, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: lionCoveBlocks('compute.p8') },
      ],
    },

    // ----- GPU TILE -----
    // Per LAYER-PLAN.md: NO XMX on desktop Xe-LPG. NO dedicated GPU L2 (misses → SoC fabric).
    // L1 cache is per-Xe-core (192 KB unified L1/SLM), not per-slice. Display + media live on SoC.
    {
      id: 'gpu',
      label: 'GPU Tile · Xe-LPG · TSMC N5 · 23 mm²',
      width: 5,
      depth: 4,
      height: 0.4,
      children: [
        {
          id: 'gpu.slice-0',
          label: 'Render Slice (1× per ARL-S desktop)',
          width: 4,
          depth: 3,
          height: 0.3,
          children: [
            { id: 'gpu.slice-0.geom',   label: 'Geometry Frontend',         width: 1.2, depth: 0.4, height: 0.1 },
            { id: 'gpu.slice-0.raster', label: 'Rasterizer + Hier-Z',       width: 1.2, depth: 0.4, height: 0.1 },
            // BUG-009 fix: split the aggregate "2× Pixel Backend (ROP)" into two distinct nodes
            { id: 'gpu.slice-0.rop-0',  label: 'Pixel Backend (ROP 0)',     width: 1.0, depth: 0.4, height: 0.1 },
            { id: 'gpu.slice-0.rop-1',  label: 'Pixel Backend (ROP 1)',     width: 1.0, depth: 0.4, height: 0.1 },
            { id: 'gpu.slice-0.xe-0', label: 'Xe-core 0 (16 VEs + 192 KB L1)', width: 0.9, depth: 0.9, height: 0.2, children: xeCoreBlocks('gpu.slice-0.xe-0') },
            { id: 'gpu.slice-0.xe-1', label: 'Xe-core 1 (16 VEs + 192 KB L1)', width: 0.9, depth: 0.9, height: 0.2, children: xeCoreBlocks('gpu.slice-0.xe-1') },
            { id: 'gpu.slice-0.xe-2', label: 'Xe-core 2 (16 VEs + 192 KB L1)', width: 0.9, depth: 0.9, height: 0.2, children: xeCoreBlocks('gpu.slice-0.xe-2') },
            { id: 'gpu.slice-0.xe-3', label: 'Xe-core 3 (16 VEs + 192 KB L1)', width: 0.9, depth: 0.9, height: 0.2, children: xeCoreBlocks('gpu.slice-0.xe-3') },
          ],
        },
      ],
    },

    // ----- SOC TILE -----
    // Per LAYER-PLAN.md research:
    //   - NPU is "NPU 3720" (Gen-3, Meteor Lake carryover, NOT a new NPU 3)
    //   - NO IPU on desktop 285K (mobile-only)
    //   - NO LP E-cores / LP-island on desktop (mobile-only)
    //   - Must include: Coherent Fabric, Memory Fabric, Security Complex, Power Manager
    //     (these were missing previously per official Intel architecture diagram)
    //   - 3 D2D edge bridges: CPU D2D (H-IDI), GPU D2D (CXL), IOE D2D
    {
      id: 'soc',
      label: 'SoC Tile · TSMC N6 · 87 mm²',
      width: 8,
      depth: 8,
      height: 0.4,
      children: [
        {
          id: 'soc.npu',
          label: 'AI Complex — NPU 3720 (Gen-3 MTL carryover, ~13 TOPS)',
          width: 2.5,
          depth: 2.5,
          height: 0.3,
          children: [
            {
              id: 'soc.npu.nce-0',
              label: 'NCE 0 (2K MACs + 2 SHAVE DSPs, ~4 TOPS @ 1 GHz)',
              width: 1, depth: 1, height: 0.2,
              children: [
                { id: 'soc.npu.nce-0.macs', label: '2K INT8/FP16 MAC array', width: 0.8, depth: 0.8, height: 0.1 },
                { id: 'soc.npu.nce-0.shave-0', label: 'SHAVE DSP 0', width: 0.3, depth: 0.3, height: 0.1 },
                { id: 'soc.npu.nce-0.shave-1', label: 'SHAVE DSP 1', width: 0.3, depth: 0.3, height: 0.1 },
              ],
            },
            {
              id: 'soc.npu.nce-1',
              label: 'NCE 1 (2K MACs + 2 SHAVE DSPs, ~4 TOPS @ 1 GHz)',
              width: 1, depth: 1, height: 0.2,
              children: [
                { id: 'soc.npu.nce-1.macs', label: '2K INT8/FP16 MAC array', width: 0.8, depth: 0.8, height: 0.1 },
                { id: 'soc.npu.nce-1.shave-0', label: 'SHAVE DSP 0', width: 0.3, depth: 0.3, height: 0.1 },
                { id: 'soc.npu.nce-1.shave-1', label: 'SHAVE DSP 1', width: 0.3, depth: 0.3, height: 0.1 },
              ],
            },
            { id: 'soc.npu.sram', label: '4 MB Scratchpad SRAM (shared)', width: 2, depth: 0.5, height: 0.1 },
          ],
        },
        {
          id: 'soc.imc',
          label: 'Integrated Memory Controller (DDR5-6400, 2 channels)',
          width: 3, depth: 1, height: 0.2,
          children: [
            { id: 'soc.imc.mc-0', label: 'Memory Channel A', width: 1.3, depth: 0.8, height: 0.1 },
            { id: 'soc.imc.mc-1', label: 'Memory Channel B', width: 1.3, depth: 0.8, height: 0.1 },
          ],
        },
        { id: 'soc.coherent-fabric', label: 'Coherent Fabric (ring/mesh)',  width: 4,   depth: 1.2, height: 0.15 },
        { id: 'soc.memory-fabric',   label: 'Memory Fabric',                width: 3,   depth: 1,   height: 0.15 },
        { id: 'soc.media',           label: 'Media Complex (enc/dec)',      width: 2,   depth: 1.5, height: 0.2 },
        { id: 'soc.display',         label: 'Display Complex (eDP/DP/HDMI)', width: 2,   depth: 1.5, height: 0.2 },
        { id: 'soc.security',        label: 'Security Complex (CSE)',       width: 1.5, depth: 1,   height: 0.2 },
        { id: 'soc.power-mgr',       label: 'Power Manager (PUNIT)',        width: 1.5, depth: 1,   height: 0.2 },
        { id: 'soc.dmi-pcie',        label: 'DMI / PCIe5 x16 / eSPI',       width: 2,   depth: 1,   height: 0.2 },
        // D2D edge bridges (rendered as perimeter blocks; pointer to neighboring tiles)
        { id: 'soc.d2d-cpu', label: 'CPU D2D (H-IDI)', width: 0.5, depth: 2, height: 0.1 },
        { id: 'soc.d2d-gpu', label: 'GPU D2D (CXL)',   width: 0.5, depth: 2, height: 0.1 },
        { id: 'soc.d2d-ioe', label: 'IOE D2D',          width: 0.5, depth: 2, height: 0.1 },
      ],
    },

    // ----- IOE TILE (IO Expander, per Intel ARL architecture diagram) -----
    {
      id: 'ioe',
      label: 'IOE Tile · TSMC N6 · 24 mm²',
      width: 4,
      depth: 3,
      height: 0.4,
      children: [
        { id: 'ioe.tbt4',        label: 'Thunderbolt 4 Controller', width: 1.5, depth: 1, height: 0.2 },
        { id: 'ioe.pcie',        label: 'PCIe 5.0 PHY (M.2 only)',  width: 2,   depth: 1, height: 0.2 },
        { id: 'ioe.display-phy', label: 'Display PHY',              width: 1.5, depth: 1, height: 0.2 },
        // BUG-007 fix: IOE D2D / FDI Bridge node added per LAYER-PLAN.md
        { id: 'ioe.d2d',         label: 'IOE D2D / FDI Bridge',     width: 1.5, depth: 1, height: 0.2 },
      ],
    },

    // ----- UNCORE OVERLAY (fabric layer) -----
    {
      id: 'uncore',
      label: 'Uncore PMUs (overlay)',
      width: 13, depth: 13, height: 0.02,
      children: [
        { id: 'uncore.llc-ring', label: 'LLC Ring (HAC_CBO)',  width: 12, depth: 12, height: 0.01 },
        { id: 'uncore.hac-arb',  label: 'HAC Arbitration',      width: 8,  depth: 1, height: 0.01 },
        { id: 'uncore.ncu',      label: 'NCU (UCLK)',           width: 0.5, depth: 0.5, height: 0.01 },
        { id: 'uncore.pp0',      label: 'Power Plane 0 (cores)', width: 8,  depth: 12, height: 0.01 },
        { id: 'uncore.pp1',      label: 'Power Plane 1 (uncore+GPU)', width: 13, depth: 4, height: 0.01 },
      ],
    },
  ],
}

// Helper: canonical Lion Cove L3 sub-blocks per references/chip-taxonomy.md
function lionCoveBlocks(parentId: string): BlockSpec[] {
  return [
    {
      id: `${parentId}.frontend`,
      label: 'Front End (8-wide decode)',
      width: 1.3, depth: 0.3, height: 0.1,
      children: [
        { id: `${parentId}.frontend.bpu`,       label: 'Branch Predictor', width: 0.4, depth: 0.2, height: 0.05 },
        { id: `${parentId}.frontend.fetch`,     label: 'Fetch (64 B/cyc)', width: 0.4, depth: 0.2, height: 0.05 },
        { id: `${parentId}.frontend.decode`,    label: 'Decode (8-wide)',  width: 0.5, depth: 0.2, height: 0.05, instanceOf: 'decode.lane', count: 8 },
        { id: `${parentId}.frontend.uop-cache`, label: 'µop Cache (5.25K)', width: 0.4, depth: 0.2, height: 0.05 },
        { id: `${parentId}.frontend.uop-queue`, label: 'µop Queue (192)',   width: 0.4, depth: 0.2, height: 0.05 },
      ],
    },
    { id: `${parentId}.ooo`,    label: 'Out-of-Order (576 ROB, split INT/VEC)',         width: 1.3, depth: 0.3, height: 0.1 },
    { id: `${parentId}.exec`,   label: 'Execution Ports (18 wide)',                     width: 1.3, depth: 0.3, height: 0.1, instanceOf: 'exec.port', count: 18 },
    { id: `${parentId}.memory`, label: 'Memory (L0D 48K / L1D 192K / L2 3M / L3 3M)', width: 1.3, depth: 0.3, height: 0.1 },
  ]
}

// Helper: Skymont cluster sub-blocks
// Per LAYER-PLAN.md: ARL Skymont clusters DO NOT have MSC (Lunar Lake-only feature).
// Instead, Skymont cores tap the 36 MB L3 ring directly — first time E-cores get L3.
function skymontClusterBlocks(parentId: string): BlockSpec[] {
  return [
    { id: `${parentId}.core-0`, label: 'Skymont 0 (9-wide 3×3, 416 ROB, 26 ports)', width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-1`, label: 'Skymont 1',                                  width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-2`, label: 'Skymont 2',                                  width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-3`, label: 'Skymont 3',                                  width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.l2`,     label: 'Shared 4 MB L2 (128 B/cyc)',                 width: 2.5, depth: 0.4, height: 0.1 },
  ]
}

// Helper: Xe-core internals — 16 Vector Engines (Intel renamed EU → VE for
// the ARL Xe-LPG generation per LAYER-PLAN.md). Also includes Sampler + RT Unit.
// BUG-008 fix: was previously labeled "16 Execution Units" with id `.eus`.
function xeCoreBlocks(parentId: string): BlockSpec[] {
  return [
    { id: `${parentId}.ves`,     label: '16 Vector Engines (VEs)', width: 0.7, depth: 0.7, height: 0.1, instanceOf: 've', count: 16 },
    { id: `${parentId}.sampler`, label: 'Sampler',                  width: 0.5, depth: 0.3, height: 0.08 },
    { id: `${parentId}.rt`,      label: 'RT Unit',                  width: 0.5, depth: 0.3, height: 0.08 },
  ]
}
