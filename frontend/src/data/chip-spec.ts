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
  /**
   * When this block becomes the deepest focus, the scene enters "context mode":
   *   - Base Tile, IHS, all L0 chiplets, and ancestor wireframe ghosts hide
   *   - Only this block's children render (the "board" the user is inspecting)
   *   - A name plate at the bottom shows this block's label
   * Used for entering deep contexts like a single P-core's full ISA pipeline.
   */
  enterContext?: boolean
}

/**
 * Lion Cove board canvas — die-shot accurate.
 *
 * The board is RENDERED VERTICALLY by ContextBoard (a flat poster facing the
 * camera). Each cell's localX is its X position on the board face, and
 * localZ is its Y position (with +Z = TOP of the board). The renderer
 * rotates the spec coordinates into the camera-facing X-Y plane.
 *
 * Coordinate ranges (raw chip-spec units):
 *   localX:  [-8, +8]   total width 16
 *   localZ:  [-7, +7]   total height 14
 *
 * Cell positions match the die shot column structure exactly:
 *   Top 5 rows: full-width-and-band-ish (FE caches, decode, queue, allocate, reg files)
 *   Rows 6+:    4 vertical columns (Vector / Integer / Store Data / Memory)
 *
 * Reference: F:\Raptor-K-E\reference images\die p core.jpg
 */
export const LION_COVE_BOARD = {
  width: 16,
  depth: 14, // really board height in the vertical-board rendering
} as const

// Helper: spread N labeled cells horizontally across [x0, x1] at one row.
// Returns BlockSpec[] with sequential ids.
function rowCells(
  idPrefix: string,
  labels: string[],
  y: number,
  x0: number,
  x1: number,
  rowHeight: number,
): BlockSpec[] {
  const w = (x1 - x0) / labels.length
  return labels.map((label, i) => ({
    id: `${idPrefix}-${i}`,
    label,
    localX: x0 + w * (i + 0.5),
    localZ: y,
    width: w,
    depth: rowHeight,
    height: 0.15,
  }))
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
      // Click Compute → enter context mode, show the L1 board (P-cores +
      // E-clusters + 12 L3 slices + ring agent) as a poster perpendicular
      // to the camera, just like the L2 Lion Cove board does for P-cores.
      // Handled by ComputeBoardProjector.tsx.
      enterContext: true,
      children: [
        // ─── TOP CORE ROW (north edge) ───────────────────────────────
        { id: 'compute.p1', label: 'P-core #1 · Lion Cove', localX: -2.92, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p1') },
        { id: 'compute.e1', label: 'E-cluster #1 · 4× Skymont', localX: -1.75, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e1') },
        { id: 'compute.p3', label: 'P-core #3 · Lion Cove', localX: -0.58, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p3') },
        { id: 'compute.p5', label: 'P-core #5 · Lion Cove', localX:  0.58, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p5') },
        { id: 'compute.e3', label: 'E-cluster #3 · 4× Skymont', localX:  1.75, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e3') },
        { id: 'compute.p7', label: 'P-core #7 · Lion Cove', localX:  2.92, localZ: -1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p7') },

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
        { id: 'compute.p2', label: 'P-core #2 · Lion Cove', localX: -2.92, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p2') },
        { id: 'compute.e2', label: 'E-cluster #2 · 4× Skymont', localX: -1.75, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e2') },
        { id: 'compute.p4', label: 'P-core #4 · Lion Cove', localX: -0.58, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p4') },
        { id: 'compute.p6', label: 'P-core #6 · Lion Cove', localX:  0.58, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p6') },
        { id: 'compute.e4', label: 'E-cluster #4 · 4× Skymont', localX:  1.75, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, children: skymontClusterBlocks('compute.e4') },
        { id: 'compute.p8', label: 'P-core #8 · Lion Cove', localX:  2.92, localZ:  1.9, width: 1.05, depth: 1.15, height: 0.4, enterContext: true, layout: 'manual', children: lionCoveBoardBlocks('compute.p8') },
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

/**
 * Lion Cove P-core full pipeline board — die-shot accurate.
 *
 * Reference: F:\Raptor-K-E\reference images\die p core.jpg
 *
 * When a P-core is clicked, the parent block has `enterContext: true` so the
 * scene shifts: Base/IHS/L0/L1 ghosts unmount, and this board fills the
 * viewport. Board footprint scaled to LION_COVE_BOARD_SCALE so the actual 3D
 * mesh dimensions match the viewport — NOT via camera zoom.
 *
 * Bands (after scaling, board ≈ 14 wide × 9.5 deep):
 *   Band 1 (top):   Front-end caches — I-TLB+ICache · BPU
 *   Band 2:         Decode row — MSROM · Decode 8-wide (×8) · µOP Cache 12-wide
 *   Band 3:         µOP Queue (full width)
 *   Band 4:         Allocate / Rename / Move Elim / Zero Idiom (full width)
 *   Band 5:         Register Files — Vec RF · Int RF
 *   Band 6:         4 scheduler headers
 *   Band 7:         Port banks (V0-V3 | P0-P5 | P10-P11 | P20-P27)
 *   Bands 8-9:      4 exec clusters
 *   Band 10:        MISC (center) + cache stack (right column)
 */
function lionCoveBoardBlocks(parentId: string): BlockSpec[] {
  const p = parentId
  // Y coords on board (vertical), 0 at center, +7 top, -7 bottom
  // X coords on board (horizontal), 0 at center, ±8 edges
  // Columns of the lower half:
  const VEC_X0  = -8,   VEC_X1  = -5   // Vector column [3 wide]
  const INT_X0  = -5,   INT_X1  =  2   // Integer column [7 wide]
  const STO_X0  =  2,   STO_X1  =  3   // Store Data column [1 wide]
  const MEM_X0  =  3,   MEM_X1  =  8   // Memory column [5 wide]

  // Row Y centers (top to bottom)
  const R1 = 6.5    // FE caches
  const R2 = 5.5    // decode row
  const R3 = 4.5    // µOP queue
  const R4 = 3.5    // allocate/rename
  const R5 = 2.5    // register files
  const R6 = 1.5    // scheduler headers
  const R7 = 0.5    // port row
  const R8 = -0.5   // exec row 1 (FMA/FADD ; ALU×6 ; STORE DATA top ; AGU×6)
  const R9 = -1.5   // exec row 2 (ALU×4 ; JMP/SHIFT×6 ; ... ; LOAD/STA×6)
  const R10 = -2.5  // exec row 3 (SHIFT/SHUF ; MUL×3 ; ... ; L0 D$)
  const R11 = -3.5  // exec row 4 (FPDIV×2 ; MISC start ; ... ; L1 D$)
  // Bottom-fill block centers (height 3, spans Y[-7,-4]):
  const BOT_C = -5.5
  const BOT_H = 3

  return [
    // ─── Row 1: FE top — I-TLB+I-Cache | BPU ───────────────────────
    { id: `${p}.itlb-icache`, label: 'I-TLB + I-Cache', localX: -3,   localZ: R1, width: 10, depth: 1, height: 0.15 },
    { id: `${p}.bpu`,         label: 'BPU',             localX:  5,   localZ: R1, width: 6,  depth: 1, height: 0.15 },

    // ─── Row 2: Decode — MSROM | Decode | µOP Cache ────────────────
    { id: `${p}.msrom`,     label: 'MSROM (4-wide)',     localX: -7,   localZ: R2, width: 2, depth: 1, height: 0.15 },
    { id: `${p}.decode`,    label: 'Decode (8-wide)',    localX: -1.5, localZ: R2, width: 9, depth: 1, height: 0.15, instanceOf: 'decode.lane', count: 8 },
    { id: `${p}.uop-cache`, label: 'µOP Cache (12-wide)', localX:  5.5, localZ: R2, width: 5, depth: 1, height: 0.15 },

    // ─── Row 3: µOP Queue (full width) ─────────────────────────────
    { id: `${p}.uop-queue`, label: 'µOP Queue (192 entries)', localX: 0, localZ: R3, width: 16, depth: 1, height: 0.15 },

    // ─── Row 4: Allocate / Rename (full width) ─────────────────────
    { id: `${p}.allocate`, label: 'Allocate · Rename · Move Elim · Zero Idiom (8-wide)', localX: 0, localZ: R4, width: 16, depth: 1, height: 0.15 },

    // ─── Row 5: Register Files ─────────────────────────────────────
    { id: `${p}.vec-rf`, label: 'Vector Register File',  localX: -6.5, localZ: R5, width: 3,  depth: 1, height: 0.15 },
    { id: `${p}.int-rf`, label: 'Integer Register File', localX:  1.5, localZ: R5, width: 13, depth: 1, height: 0.15 },

    // ─── Row 6: Scheduler headers (4 columns) ──────────────────────
    { id: `${p}.vec-sched`, label: 'Vector Scheduler',     localX: -6.5, localZ: R6, width: 3, depth: 1, height: 0.15 },
    { id: `${p}.int-sched`, label: 'Integer Scheduler',    localX: -1.5, localZ: R6, width: 7, depth: 1, height: 0.15 },
    { id: `${p}.sto-sched`, label: 'Store Data Scheduler', localX:  2.5, localZ: R6, width: 1, depth: 1, height: 0.15 },
    { id: `${p}.mem-sched`, label: 'Memory Scheduler',     localX:  5.5, localZ: R6, width: 5, depth: 1, height: 0.15 },

    // ─── Row 7: Port rows ──────────────────────────────────────────
    ...rowCells(`${p}.v-port`,   ['V0', 'V2', 'V1', 'V3'],                       R7, VEC_X0, VEC_X1, 1),
    ...rowCells(`${p}.p-port`,   ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'],           R7, INT_X0, INT_X1, 1),
    ...rowCells(`${p}.sd-port`,  ['P10', 'P11'],                                  R7, STO_X0, STO_X1, 1),
    ...rowCells(`${p}.m-port`,   ['P20', 'P25', 'P21', 'P26', 'P22', 'P27'],     R7, MEM_X0, MEM_X1, 1),

    // ─── Row 8: Exec row 1 ─────────────────────────────────────────
    ...rowCells(`${p}.v-r8`, ['FMA', 'FADD', 'FMA', 'FADD'],                      R8, VEC_X0, VEC_X1, 1),
    ...rowCells(`${p}.i-r8`, ['ALU', 'ALU', 'ALU', 'ALU', 'ALU', 'ALU'],          R8, INT_X0, INT_X1, 1),
    ...rowCells(`${p}.m-r8`, ['AGU', 'AGU', 'AGU', 'AGU', 'AGU', 'AGU'],          R8, MEM_X0, MEM_X1, 1),

    // ─── Row 9: Exec row 2 ─────────────────────────────────────────
    ...rowCells(`${p}.v-r9`, ['ALU', 'ALU', 'ALU', 'ALU'],                        R9, VEC_X0, VEC_X1, 1),
    ...rowCells(`${p}.i-r9`, ['JMP', 'SHIFT', 'JMP', 'SHIFT', 'JMP', 'SHIFT'],   R9, INT_X0, INT_X1, 1),
    ...rowCells(`${p}.m-r9`, ['LOAD', 'STA', 'LOAD', 'STA', 'LOAD', 'STA'],       R9, MEM_X0, MEM_X1, 1),

    // ─── Row 10: Exec row 3 (vec SHIFT/SHUF, int MUL×3 with gaps, mem L0 cache) ──
    ...rowCells(`${p}.v-r10`, ['SHIFT', 'SHUF', 'SHIFT', 'SHUF'],                 R10, VEC_X0, VEC_X1, 1),
    // Integer MUL × 3 placed at P1, P3, P5 column positions (skip P0/P2/P4 slots)
    { id: `${p}.i-mul-0`, label: 'MUL', localX: -3.25,  localZ: R10, width: 7/6, depth: 1, height: 0.15 },
    { id: `${p}.i-mul-1`, label: 'MUL', localX: -0.917, localZ: R10, width: 7/6, depth: 1, height: 0.15 },
    { id: `${p}.i-mul-2`, label: 'MUL', localX:  1.417, localZ: R10, width: 7/6, depth: 1, height: 0.15 },
    { id: `${p}.l0d`,     label: '48 KB L0 D-Cache', localX: 5.5, localZ: R10, width: 5, depth: 1, height: 0.15 },

    // ─── Row 11: vec FPDIV×2, int MISC starts, mem L1 cache ────────
    { id: `${p}.v-fpdiv-0`, label: 'FPDIV', localX: -7.25, localZ: R11, width: 1.5, depth: 1, height: 0.15 },
    { id: `${p}.v-fpdiv-1`, label: 'FPDIV', localX: -5.75, localZ: R11, width: 1.5, depth: 1, height: 0.15 },
    { id: `${p}.l1d`,       label: '192 KB L1 D-Cache', localX: 5.5, localZ: R11, width: 5, depth: 1, height: 0.15 },

    // ─── Bottom-fill — per-column heights matching die-shot proportions ─
    // Each fill block extends from its column's start Y down to the board bottom.
    // In the die shot, MUL/FPDIV cells visually layer ON TOP of these fills
    // (BoardCell uses a Z offset so fills render behind their overlaying cells).
    //
    // Vector column: X87/MMX fills below FPDIV row (R11=-3.5) down to bottom.
    //   spans Y=[-7, -4], depth 3, center -5.5
    { id: `${p}.x87-mmx`, label: 'X87 / MMX', localX: -6.5, localZ: -5.5, width: 3, depth: 3, height: 0.15 },
    // Integer column: MISC fills from below JMP/SHIFT row (R9=-1.5) down to bottom.
    //   Covers the MUL row's empty gaps. MUL cells at R10=-2.5 sit on top via Z offset.
    //   spans Y=[-7, -2], depth 5, center -4.5
    { id: `${p}.misc`,    label: 'MISC',      localX: -1.5, localZ: -4.5, width: 7, depth: 5, height: 0.15 },
    // Store data column: STORE DATA fills from below P10/P11 (R7=0.5) down to bottom.
    //   spans Y=[-7, 0], depth 7, center -3.5
    { id: `${p}.store-data`, label: 'Store Data', localX: 2.5, localZ: -3.5, width: 1, depth: 7, height: 0.15 },
    // Memory column: L2 cache fills below L1 D-Cache (R11=-3.5) to bottom.
    //   spans Y=[-7, -4], depth 3, center -5.5
    { id: `${p}.l2`,      label: 'up to 3 MB L2 Cache', localX: 5.5, localZ: -5.5, width: 5, depth: 3, height: 0.15 },
  ]
}


// Legacy 4-block helper kept for any non-P-core caller (currently none).
// Lion Cove P-cores now use lionCoveBoardBlocks for the full-pipeline view.
function lionCoveBlocks(parentId: string): BlockSpec[] {
  return lionCoveBoardBlocks(parentId)
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
