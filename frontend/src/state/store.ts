/**
 * Zustand store — minimal for Phase 2.
 *
 * Phase 2 needs only focusPath + hover for the L0 4-tile view; findings/metrics/narrative
 * arrive in Phase 4. Per skill, subscribe with selectors so 60 Hz useFrame callbacks
 * don't force re-renders.
 */
import { create } from 'zustand'
import type { BlockId, TMAReport, Finding, MetricSnapshot } from './schema'

/**
 * Boot lifecycle:
 *   lidded    — page just loaded; IHS covers the chiplets with loading border
 *   delidding — data arrived; IHS lift+fade animation in progress (~1.2s)
 *   delidded  — animation done; normal Phase 3 drill behavior is active
 */
export type BootState = 'lidded' | 'delidding' | 'delidded'

interface RaptorStore {
  // Boot lifecycle
  bootState: BootState
  siliconFamily: string // e.g. "ARL Client Platform"
  cpuSku: string // e.g. "Intel Core Ultra 9 270K Plus"
  batchId: string // decorative — e.g. "SRQDS L537F370"

  // Trace
  trace: TMAReport | null
  findings: Record<BlockId, Finding>
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>

  // Navigation
  focusPath: BlockId[]
  hoveredBlockId: BlockId | null

  // Actions
  loadTrace: (r: TMAReport) => void
  beginDelid: () => void
  finishDelid: () => void
  focus: (path: BlockId[]) => void
  pushFocus: (id: BlockId) => void
  popFocus: () => void
  hover: (id: BlockId | null) => void
}

export const useStore = create<RaptorStore>((set, get) => ({
  bootState: 'lidded',
  siliconFamily: 'ARL Client Platform',
  cpuSku: 'Intel Core Ultra 9 270K Plus',
  batchId: 'SRQDS · L537F370',

  trace: null,
  findings: {},
  metrics: {},
  narrative: {},
  focusPath: [],
  hoveredBlockId: null,

  loadTrace: (r) => {
    set({
      trace: r,
      findings: Object.fromEntries(r.findings.map((f) => [f.blockId, f])),
      metrics: r.metrics,
      narrative: r.narrative,
      // Pull silicon family / SKU off the report if backend provided them
      siliconFamily: r.silicon_family ?? get().siliconFamily,
      cpuSku: r.cpu_sku ?? get().cpuSku,
      batchId: r.batch_id ?? get().batchId,
    })
    // First trace load triggers the delid animation
    if (get().bootState === 'lidded') {
      set({ bootState: 'delidding' })
    }
  },
  beginDelid: () => set({ bootState: 'delidding' }),
  finishDelid: () => set({ bootState: 'delidded' }),
  focus: (path) => set({ focusPath: path }),
  pushFocus: (id) => set((s) => ({ focusPath: [...s.focusPath, id] })),
  popFocus: () => set((s) => ({ focusPath: s.focusPath.slice(0, -1) })),
  hover: (id) => set({ hoveredBlockId: id }),
}))

// Dev-only: expose the store on window for chrome-devtools-mcp drill testing.
// Lets us call `__raptor.pushFocus('compute')` from the devtools console or
// MCP evaluate_script. Stripped by Vite in production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __raptor: typeof useStore }).__raptor = useStore
}
