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
    {
      id: 'compute',
      label: 'Compute Tile (TSMC N3B, 117 mm²)',
      width: 8,
      depth: 12,
      height: 0.6,
      children: [
        // 8 Lion Cove P-cores in EMON module order: 0,1,4,5,6,7,10,11
        { id: 'compute.p-core-0', label: 'P-core 0 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-0') },
        { id: 'compute.p-core-1', label: 'P-core 1 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-1') },
        { id: 'compute.p-core-4', label: 'P-core 4 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-4') },
        { id: 'compute.p-core-5', label: 'P-core 5 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-5') },
        { id: 'compute.p-core-6', label: 'P-core 6 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-6') },
        { id: 'compute.p-core-7', label: 'P-core 7 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-7') },
        { id: 'compute.p-core-10', label: 'P-core 10 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-10') },
        { id: 'compute.p-core-11', label: 'P-core 11 (Lion Cove)', width: 1.5, depth: 1.5, height: 0.4, children: lionCoveBlocks('compute.p-core-11') },
        // 4 Skymont E-clusters at modules 2,3,8,9
        { id: 'compute.e-cluster-2', label: 'E-cluster (mod 2, 4× Skymont)', width: 3, depth: 2, height: 0.4, children: skymontClusterBlocks('compute.e-cluster-2') },
        { id: 'compute.e-cluster-3', label: 'E-cluster (mod 3, 4× Skymont)', width: 3, depth: 2, height: 0.4, children: skymontClusterBlocks('compute.e-cluster-3') },
        { id: 'compute.e-cluster-8', label: 'E-cluster (mod 8, 4× Skymont)', width: 3, depth: 2, height: 0.4, children: skymontClusterBlocks('compute.e-cluster-8') },
        { id: 'compute.e-cluster-9', label: 'E-cluster (mod 9, 4× Skymont)', width: 3, depth: 2, height: 0.4, children: skymontClusterBlocks('compute.e-cluster-9') },
        // L3 ring overlay (HAC arbitration + CBO)
        { id: 'compute.l3-ring', label: 'L3 Ring (HAC)', width: 7, depth: 11, height: 0.05 },
      ],
    },

    // ----- GPU TILE -----
    {
      id: 'gpu',
      label: 'GPU Tile (Xe-LPG, TSMC N5P, 23 mm²)',
      width: 5,
      depth: 4,
      height: 0.4,
      children: [
        {
          id: 'gpu.slice-0',
          label: 'Render Slice (4 Xe-cores, 64 EUs, 192 KB L1)',
          width: 4,
          depth: 3,
          height: 0.3,
          children: [
            { id: 'gpu.slice-0.xe-0', label: 'Xe-core 0 (16 EUs)', width: 0.9, depth: 0.9, height: 0.2, children: euGrid('gpu.slice-0.xe-0') },
            { id: 'gpu.slice-0.xe-1', label: 'Xe-core 1 (16 EUs)', width: 0.9, depth: 0.9, height: 0.2, children: euGrid('gpu.slice-0.xe-1') },
            { id: 'gpu.slice-0.xe-2', label: 'Xe-core 2 (16 EUs)', width: 0.9, depth: 0.9, height: 0.2, children: euGrid('gpu.slice-0.xe-2') },
            { id: 'gpu.slice-0.xe-3', label: 'Xe-core 3 (16 EUs)', width: 0.9, depth: 0.9, height: 0.2, children: euGrid('gpu.slice-0.xe-3') },
          ],
        },
      ],
    },

    // ----- SOC TILE -----
    {
      id: 'soc',
      label: 'SoC Tile (TSMC N6, 87 mm²)',
      width: 8,
      depth: 8,
      height: 0.4,
      children: [
        {
          id: 'soc.npu',
          label: 'NPU 3 (13 TOPS, 2 NCEs, 4 MB SRAM)',
          width: 2.5,
          depth: 2.5,
          height: 0.3,
          children: [
            {
              id: 'soc.npu.nce-0',
              label: 'NCE 0 (2K MACs + 2 SHAVE DSPs)',
              width: 1, depth: 1, height: 0.2,
              children: [
                { id: 'soc.npu.nce-0.macs', label: '2K INT8/FP16 MACs', width: 0.8, depth: 0.8, height: 0.1 },
                { id: 'soc.npu.nce-0.shave-0', label: 'SHAVE DSP 0', width: 0.3, depth: 0.3, height: 0.1 },
                { id: 'soc.npu.nce-0.shave-1', label: 'SHAVE DSP 1', width: 0.3, depth: 0.3, height: 0.1 },
              ],
            },
            {
              id: 'soc.npu.nce-1',
              label: 'NCE 1 (2K MACs + 2 SHAVE DSPs)',
              width: 1, depth: 1, height: 0.2,
              children: [
                { id: 'soc.npu.nce-1.macs', label: '2K INT8/FP16 MACs', width: 0.8, depth: 0.8, height: 0.1 },
                { id: 'soc.npu.nce-1.shave-0', label: 'SHAVE DSP 0', width: 0.3, depth: 0.3, height: 0.1 },
                { id: 'soc.npu.nce-1.shave-1', label: 'SHAVE DSP 1', width: 0.3, depth: 0.3, height: 0.1 },
              ],
            },
            { id: 'soc.npu.sram', label: '4 MB Scratchpad RAM', width: 2, depth: 0.5, height: 0.1 },
          ],
        },
        {
          id: 'soc.imc',
          label: 'IMC (DDR5, 2 channels)',
          width: 3, depth: 1, height: 0.2,
          children: [
            { id: 'soc.imc.mc-0', label: 'Memory Controller 0', width: 1.3, depth: 0.8, height: 0.1 },
            { id: 'soc.imc.mc-1', label: 'Memory Controller 1', width: 1.3, depth: 0.8, height: 0.1 },
          ],
        },
        { id: 'soc.media',   label: 'Media Engine',    width: 2, depth: 1.5, height: 0.2 },
        { id: 'soc.display', label: 'Display Engines', width: 2, depth: 1.5, height: 0.2 },
        { id: 'soc.ipu',     label: 'IPU',             width: 1.5, depth: 1, height: 0.2 },
        // LP-island only on ARL-H mobile; absent on 285K — omitted
      ],
    },

    // ----- IO TILE -----
    {
      id: 'io',
      label: 'I/O Tile (TSMC N6, 24 mm²)',
      width: 4,
      depth: 3,
      height: 0.4,
      children: [
        { id: 'io.tbt4',        label: 'Thunderbolt 4 Controller', width: 1.5, depth: 1, height: 0.2 },
        { id: 'io.pcie',        label: 'PCIe 5.0 PHY',             width: 2,   depth: 1, height: 0.2 },
        { id: 'io.display-phy', label: 'Display PHY',              width: 1.5, depth: 1, height: 0.2 },
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
function skymontClusterBlocks(parentId: string): BlockSpec[] {
  return [
    { id: `${parentId}.core-0`, label: 'Skymont 0 (9-wide, 416 ROB, 26 ports)', width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-1`, label: 'Skymont 1',                              width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-2`, label: 'Skymont 2',                              width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.core-3`, label: 'Skymont 3',                              width: 0.7, depth: 0.7, height: 0.2 },
    { id: `${parentId}.l2`,     label: 'Shared 4 MB L2',                          width: 2.5, depth: 0.4, height: 0.1 },
    { id: `${parentId}.msc`,    label: '8 MB Memory-Side Cache',                  width: 2.5, depth: 0.4, height: 0.1 },
  ]
}

// Helper: 16 EU grid for a Xe-core (instanced)
function euGrid(parentId: string): BlockSpec[] {
  return [
    { id: `${parentId}.eus`, label: '16 Execution Units', width: 0.7, depth: 0.7, height: 0.1, instanceOf: 'eu', count: 16 },
  ]
}
