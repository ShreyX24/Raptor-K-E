/**
 * Zustand store — minimal for Phase 2.
 *
 * Phase 2 needs only focusPath + hover for the L0 4-tile view; findings/metrics/narrative
 * arrive in Phase 4. Per skill, subscribe with selectors so 60 Hz useFrame callbacks
 * don't force re-renders.
 */
import { create } from 'zustand'
import type { BlockId, TMAReport, Finding, MetricSnapshot } from './schema'

interface RaptorStore {
  // Trace (Phase 4 wiring; null until "Load trace" debug action)
  trace: TMAReport | null
  findings: Record<BlockId, Finding>
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>

  // Navigation
  focusPath: BlockId[]
  hoveredBlockId: BlockId | null

  // Actions
  loadTrace: (r: TMAReport) => void
  focus: (path: BlockId[]) => void
  pushFocus: (id: BlockId) => void
  popFocus: () => void
  hover: (id: BlockId | null) => void
}

export const useStore = create<RaptorStore>((set) => ({
  trace: null,
  findings: {},
  metrics: {},
  narrative: {},
  focusPath: [],
  hoveredBlockId: null,

  loadTrace: (r) =>
    set({
      trace: r,
      findings: Object.fromEntries(r.findings.map((f) => [f.blockId, f])),
      metrics: r.metrics,
      narrative: r.narrative,
    }),
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
