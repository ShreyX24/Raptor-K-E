/**
 * FindingsPanel — DOM side panel that slides in from the right when a
 * finding-bearing block is focused.
 *
 * Phase 4 Act 3 (post-delid): when `focusPath`'s leaf has a `findings[id]`
 * entry, this panel slides in with the rules-engine summary, severity badge,
 * metric vs threshold, and the narrative explanation from `narrative[id]`.
 *
 * Hides when focus moves away (Esc / breadcrumb pop / drill into a non-finding
 * block).
 *
 * Anti-patterns avoided per skill SKILL.md:
 *   - `backdrop-filter: blur(7px)` is safe (≤8px rule)
 *   - No transition layer over the canvas — panel sits to the right
 */
import { useStore } from '@/state/store'
import { resolvePathChain } from '@/util/findBlock'
import { chipSpec } from '@/data/chip-spec'
import type { Severity } from '@/state/schema'

const SEVERITY_COLOR: Record<Severity, { fg: string; bg: string; border: string }> = {
  GREEN:    { fg: 'oklch(0.74 0.18 145)', bg: 'oklch(0.74 0.18 145 / 0.15)', border: 'oklch(0.74 0.18 145 / 0.5)' },
  YELLOW:   { fg: 'oklch(0.82 0.16 95)',  bg: 'oklch(0.82 0.16 95 / 0.15)',  border: 'oklch(0.82 0.16 95 / 0.55)' },
  RED:      { fg: 'oklch(0.68 0.22 25)',  bg: 'oklch(0.68 0.22 25 / 0.18)',  border: 'oklch(0.68 0.22 25 / 0.6)' },
  CRITICAL: { fg: 'oklch(0.62 0.28 10)',  bg: 'oklch(0.62 0.28 10 / 0.22)',  border: 'oklch(0.62 0.28 10 / 0.7)' },
}

export function FindingsPanel() {
  const focusPath = useStore((s) => s.focusPath)
  const findings = useStore((s) => s.findings)
  const narrative = useStore((s) => s.narrative)

  const focusedId = focusPath[focusPath.length - 1]
  const finding = focusedId ? findings[focusedId] : undefined
  const chain = focusPath.length ? resolvePathChain(chipSpec, focusPath) : []
  const focusedBlock = chain[chain.length - 1]

  // Slide off-screen when there's no finding to surface
  const visible = Boolean(finding && focusedBlock)
  const sev = finding ? SEVERITY_COLOR[finding.severity] : SEVERITY_COLOR.GREEN

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 right-0 z-10
                 w-[340px] max-h-[78vh] overflow-y-auto
                 text-[oklch(0.92_0.02_240)]
                 bg-[oklch(0.12_0.02_250_/_0.78)]
                 border border-l-[3px]
                 backdrop-blur-[7px]
                 transition-all duration-300 ease-out"
      style={{
        transform: visible ? 'translate(0, -50%)' : 'translate(100%, -50%)',
        opacity: visible ? 1 : 0,
        borderColor: sev.border,
        borderLeftColor: sev.fg,
        boxShadow: `inset 0 0 30px ${sev.bg}, -2px 0 24px ${sev.bg}`,
      }}
    >
      {finding && focusedBlock && (
        <div className="px-5 py-4 space-y-4">
          {/* Header — block label */}
          <div>
            <div
              className="text-[10px] tracking-[0.18em] uppercase font-silicon"
              style={{ color: 'oklch(0.55 0.02 250)' }}
            >
              Finding
            </div>
            <div className="font-silicon text-base font-bold mt-0.5 leading-tight">
              {focusedBlock.label}
            </div>
          </div>

          {/* Severity badge */}
          <div
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-silicon font-bold uppercase tracking-wider"
            style={{
              color: sev.fg,
              background: sev.bg,
              border: `1px solid ${sev.border}`,
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: sev.fg,
                boxShadow: `0 0 8px ${sev.fg}`,
              }}
            />
            {finding.severity}
          </div>

          {/* Rules-engine message */}
          <div
            className="text-[13px] leading-snug pb-3 border-b"
            style={{ borderColor: 'oklch(0.30 0.02 250 / 0.4)' }}
          >
            {finding.message}
          </div>

          {/* Metric vs threshold */}
          <div className="flex items-baseline justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-[9px] tracking-[0.16em] uppercase opacity-50 font-silicon">
                Metric
              </div>
              <div className="font-silicon text-lg font-bold" style={{ color: sev.fg }}>
                {finding.metric.toFixed(2)}
              </div>
            </div>
            <div className="text-xs opacity-50">vs</div>
            <div className="space-y-0.5">
              <div className="text-[9px] tracking-[0.16em] uppercase opacity-50 font-silicon">
                Threshold
              </div>
              <div className="font-silicon text-lg opacity-70">
                {finding.threshold.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Rule id (dev / debug context) */}
          <div className="text-[10px] font-mono opacity-40">
            rule · {finding.ruleId}
          </div>

          {/* Narrative — longer-form explanation from the rules engine */}
          {narrative[focusedId] && (
            <div
              className="text-[12px] leading-relaxed pt-3 border-t"
              style={{
                color: 'oklch(0.80 0.02 240)',
                borderColor: 'oklch(0.30 0.02 250 / 0.4)',
              }}
            >
              {narrative[focusedId]}
            </div>
          )}

          {/* Drill hint */}
          {finding.drillTarget && finding.drillTarget !== focusedId && (
            <div
              className="text-[10px] mt-3 pt-3 border-t opacity-70 font-silicon tracking-wider uppercase"
              style={{ borderColor: 'oklch(0.30 0.02 250 / 0.4)' }}
            >
              ▸ drill into {finding.drillTarget.split('.').pop()} for cycle-level detail
            </div>
          )}
        </div>
      )}
    </div>
  )
}
