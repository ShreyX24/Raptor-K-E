# Data Contract for raptor-tma

**Minimal — backend defines, frontend consumes.** Do not extend the schema without backend changes. Schema-extension reference material ("when that day comes") is at `F:\Raptor-K-E\phase-0-findings.md` Sections D + I.

The primary goal is **rendering**, not contract design. Data binding is Phase 4 in `build-plan.md`. Don't preemptively elaborate.

## TMAReport shape (MD §9 STEP 4, verbatim)

```ts
interface TMAReport {
  traceId: string
  capturedAt: string                     // ISO 8601
  cpu: 'lion-cove' | 'redwood-cove'
  domains: Record<DomainId, DomainStatus>
  findings: Finding[]
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>     // markdown
}

type DomainId = 'frontend' | 'ooo' | 'exec' | 'memory'
type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL'
type BlockId  = string                   // dotted path, e.g. "compute.p-core-0.frontend.decode.lane-3"

interface DomainStatus {
  severity: Severity
  summary: string
}

interface Finding {
  ruleId: string                         // e.g. "FE-001-BAD-SPECULATION"
  blockId: BlockId
  severity: Severity
  metric: number
  threshold: number
  message: string
  drillTarget?: BlockId                  // click finding → focus this block
}

interface MetricSnapshot {
  [counterName: string]: number          // e.g. { "metric_CPI": 0.78, "metric_L2 MPI...": 0.012 }
}
```

Generate `src/state/schema.ts` to match exactly. **Never invent fields.**

## Zustand store (`src/state/store.ts`)

One store, no Context, no Redux, no Jotai:

```ts
import { create } from 'zustand'

interface RaptorStore {
  trace: TMAReport | null
  findings: Record<BlockId, Finding>     // indexed by blockId for O(1) lookup
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>
  focusPath: BlockId[]                   // e.g. ['compute', 'p-core-0', 'frontend']
  hoveredBlockId: BlockId | null

  loadTrace: (r: TMAReport) => void
  focus: (path: BlockId[]) => void
  hover: (id: BlockId | null) => void
}

export const useStore = create<RaptorStore>((set) => ({
  trace: null,
  findings: {},
  metrics: {},
  narrative: {},
  focusPath: [],
  hoveredBlockId: null,
  loadTrace: (r) => set({
    trace: r,
    findings: Object.fromEntries(r.findings.map((f) => [f.blockId, f])),
    metrics: r.metrics,
    narrative: r.narrative,
  }),
  focus: (path) => set({ focusPath: path }),
  hover: (id) => set({ hoveredBlockId: id }),
}))
```

## Subscribe with selectors — never the whole store

```tsx
// ❌ subscribes to whole store; re-renders on any change (including hover at 60 Hz)
const store = useStore()

// ✅ selector — re-renders only when this slice changes
const finding = useStore((s) => s.findings[id])
const focusPath = useStore((s) => s.focusPath)

// ✅ read-only access in useFrame, no subscription
useFrame(() => {
  const f = useStore.getState().findings[id]
  // ...
})
```

## Binding pattern (severity → emissive)

See `materials.md` for the full `useFrame` lerp recipe. Summary: mutate `material.emissive` and `material.emissiveIntensity` via ref in `useFrame`. **Never** via React prop (triggers shader recompile).

## TMA-experimental flag (must surface in HUD)

The xlsx warns *"TMA Support for this platform is still experimental and at early stages"* — ARL TMA versions are beta (LNC 5.3-beta, SKT/CMT 5.01-beta). **Surface this in the TopBar** as a banner/badge so analysts don't over-trust numbers.

Per `aesthetic.md` HUD layout, render `[TMA-EXPERIMENTAL · ARL]` as a Sonner-style pill in the TopBar left.

## Mock trace for development (Phase 4)

`build-plan.md` Phase 4 wires a "Load trace" debug button that feeds a hand-rolled `TMAReport` JSON into the store. Use this to verify severity → emissive lerp works before real backend integration lands.

Minimal mock for testing:
```ts
const mockTrace: TMAReport = {
  traceId: 'mock-001',
  capturedAt: '2026-05-18T20:00:55.000Z',
  cpu: 'lion-cove',
  domains: {
    frontend: { severity: 'RED', summary: 'Front End bound 47%' },
    ooo:      { severity: 'GREEN', summary: 'OoO healthy' },
    exec:     { severity: 'YELLOW', summary: 'Port pressure on 0/1' },
    memory:   { severity: 'GREEN', summary: 'L1D MPI low' },
  },
  findings: [
    {
      ruleId: 'FE-001-BAD-SPECULATION',
      blockId: 'compute.p-core-0.frontend.decode',
      severity: 'CRITICAL',
      metric: 0.31, threshold: 0.10,
      message: 'Decode stalls dominate; consider PGO',
      drillTarget: 'compute.p-core-0.frontend.decode.lane-3',
    },
  ],
  metrics: { 'compute.p-core-0': { 'metric_CPI': 0.92, 'metric_L2 MPI': 0.012 } },
  narrative: { 'compute.p-core-0.frontend.decode': '## Decode bottleneck\nLane 3 saturates...' },
}
```

## Anti-patterns

- **Inventing fields** on `TMAReport` (breaks backend integration silently)
- **Designing the data layer before the 3D scene renders** (per the primary goal)
- **Computing metric values in the frontend** (backend's job; we display)
- **Making the contract async/streaming-aware before the backend supports it**
- **Adding `coreType` / `TileId` / `CollectionMode` preemptively** — those are documented as future needs in `F:\Raptor-K-E\phase-0-findings.md` Sections D + I; wait for the backend to need them

## When the backend emits more (deferred)

If/when backend lands whole-die support, the schema extensions sketched in `phase-0-findings.md` Sections D + I become relevant: `TileId`, `CoreType`, `CollectionMode`, `TraceMetadata` expansion, per-tile-domain `DomainId`s, per-core-type `MetricSnapshot` tagging. **Extend then, not now.**

Until then: every Finding has a `blockId`; that's the join key into the 3D scene. The scene knows nothing about PMU events — it only knows "this block has finding X with severity Y."
