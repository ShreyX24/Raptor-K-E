/**
 * TMAReport contract — backend defines, frontend consumes.
 *
 * Verbatim from MD §9 STEP 4 / .claude/skills/raptor-tma-3d/references/data-contract.md.
 * Do NOT extend without backend changes. Schema-extension reference material is
 * at F:\Raptor-K-E\phase-0-findings.md Sections D + I for "when that day comes".
 */
export type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL'

export type DomainId = 'frontend' | 'ooo' | 'exec' | 'memory'

export type BlockId = string // dotted path, e.g. "compute.p-core-0.frontend.decode.lane-3"

export interface DomainStatus {
  severity: Severity
  summary: string
}

export interface Finding {
  ruleId: string
  blockId: BlockId
  severity: Severity
  metric: number
  threshold: number
  message: string
  drillTarget?: BlockId
}

export interface MetricSnapshot {
  [counterName: string]: number
}

export interface TMAReport {
  traceId: string
  capturedAt: string // ISO 8601
  cpu: 'lion-cove' | 'redwood-cove'
  domains: Record<DomainId, DomainStatus>
  findings: Finding[]
  metrics: Record<BlockId, MetricSnapshot>
  narrative: Record<BlockId, string>
}
