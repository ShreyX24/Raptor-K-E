/**
 * Mock TMAReport for development — fires the delid animation without a real backend.
 *
 * Use via `LoadTraceButton` (dev-only) or by calling `useStore.getState().loadTrace(mockTrace)`
 * from the devtools console / chrome-devtools-mcp.
 *
 * Backend's real TMAReport conforms to src/state/schema.ts. This shape is a
 * minimal valid example with a couple of findings so Phase 4 second-half work
 * (severity binding) has something to react to.
 */
import type { TMAReport } from '@/state/schema'

export const mockTrace: TMAReport = {
  traceId: 'mock-arl-285k-2026-05-18',
  capturedAt: new Date().toISOString(),
  cpu: 'lion-cove',

  // Phase 4 IHS metadata
  silicon_family: 'ARL Client Platform',
  cpu_sku: 'Intel Core Ultra 9 270K Plus',
  batch_id: 'SRQDS · L537F370',

  domains: {
    frontend: { severity: 'YELLOW', summary: 'µop cache underused on hot loop' },
    ooo: { severity: 'GREEN', summary: 'OoO engine healthy' },
    exec: { severity: 'GREEN', summary: 'Port pressure within budget' },
    memory: { severity: 'RED', summary: 'L2 demand miss rate elevated' },
  },

  findings: [
    {
      ruleId: 'fe-uop-cache-low',
      blockId: 'compute.p-core-0.frontend',
      severity: 'YELLOW',
      metric: 0.42,
      threshold: 0.55,
      message: 'µop cache hit rate 42% — below 55% target. Hot loop too large for 5.25K entries.',
      drillTarget: 'compute.p-core-0.frontend',
    },
    {
      ruleId: 'mem-l2-miss-rate',
      blockId: 'compute.p-core-0.memory',
      severity: 'RED',
      metric: 0.18,
      threshold: 0.08,
      message: 'L2 miss rate 18% — 2.25× target. Working set likely spills to L3.',
      drillTarget: 'compute.p-core-0.memory',
    },
  ],

  metrics: {
    'compute.p-core-0.frontend': {
      'UOPS_DISPATCHED.THREAD': 1_240_000_000,
      'IDQ.MS_UOPS': 8_400_000,
      'IDQ.DSB_UOPS': 520_000_000,
      'IDQ.MITE_UOPS': 710_000_000,
    },
    'compute.p-core-0.memory': {
      'L2_RQSTS.MISS': 18_400_000,
      'L2_RQSTS.REFERENCES': 102_000_000,
      'MEM_LOAD_RETIRED.L3_HIT': 4_200_000,
    },
  },

  narrative: {
    'compute.p-core-0.frontend':
      'Front-end stalls dominate: only 42% of µops sourced from the DSB µop cache, well below the 55% healthy threshold. The decoded-streaming buffer is thrashing — your hot loop is larger than the 5.25K µop budget. Consider tighter loop bodies or PGO to reduce icache pressure.',
    'compute.p-core-0.memory':
      'L2 demand miss rate has climbed to 18% (target ≤ 8%). The working set is spilling to L3, paying ~30 extra cycles per access. Likely candidates: large hash tables, unaligned struct-of-arrays, or contention from a neighbouring P-core.',
  },
}
