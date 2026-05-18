/**
 * BlockMetrics — Html overlay showing the top PMU counters for a block.
 *
 * Phase 4 Act 3 (post-delid): once data is bound, blocks with `metrics[blockId]`
 * surface their top 2-3 counters as a small floating panel anchored to the
 * block's top-face center. Screen-aligned (drei `<Html>` without `transform`)
 * because the camera is near-top-down — keeps the panel readable from above.
 *
 * Mounted by `Block.tsx` only when:
 *   - bootState !== 'lidded' (no overlays during the boot screen)
 *   - the block is currently visible at the drill depth
 *   - the block has metrics in the store
 *
 * Performance: cheap because at most 3-5 blocks have metrics at any depth in a
 * typical TMA report. drei `<Html>` only renders DOM when mounted.
 */
import { useMemo } from 'react'
import { Html } from '@react-three/drei'

import { useStore } from '@/state/store'

interface BlockMetricsProps {
  blockId: string
  /** Y position of the block's top face (anchor for the overlay) */
  topY: number
  /** show at most this many counters (default 2) */
  maxCounters?: number
}

// Counter names → friendly short labels for the HUD (truncate the dotted Intel SDM names)
function shortLabel(counterName: string): string {
  // Truncate long Intel SDM names: keep the part after the LAST '.'
  const parts = counterName.split('.')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

// Pretty-print large numbers (1_240_000_000 → "1.24G")
function formatValue(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'G'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(0)
}

export function BlockMetrics({ blockId, topY, maxCounters = 2 }: BlockMetricsProps) {
  const metrics = useStore((s) => s.metrics[blockId])
  const severity = useStore((s) => s.findings[blockId]?.severity)

  const topCounters = useMemo(() => {
    if (!metrics) return []
    // Largest values first — those are the "loudest" counters and most worth surfacing
    return Object.entries(metrics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxCounters)
  }, [metrics, maxCounters])

  if (!metrics || topCounters.length === 0) return null

  // Color tint based on severity (matches util/severity.ts)
  const severityTint =
    severity === 'CRITICAL' ? 'rgba(255, 34, 51, 0.18)'
      : severity === 'RED' ? 'rgba(255, 85, 102, 0.18)'
      : severity === 'YELLOW' ? 'rgba(255, 204, 51, 0.18)'
      : 'rgba(0, 178, 255, 0.14)'

  const borderTint =
    severity === 'CRITICAL' ? 'rgba(255, 34, 51, 0.7)'
      : severity === 'RED' ? 'rgba(255, 85, 102, 0.7)'
      : severity === 'YELLOW' ? 'rgba(255, 204, 51, 0.7)'
      : 'rgba(0, 178, 255, 0.55)'

  return (
    <Html
      position={[0, topY + 0.15, 0]}
      center
      pointerEvents="none"
      zIndexRange={[8, 0]}
    >
      <div
        className="font-silicon"
        style={{
          minWidth: '140px',
          padding: '7px 11px',
          background: `rgba(8, 14, 26, 0.82)`,
          border: `1px solid ${borderTint}`,
          borderRadius: '5px',
          backdropFilter: 'blur(7px)',
          WebkitBackdropFilter: 'blur(7px)',
          color: 'rgba(232, 240, 250, 0.95)',
          fontSize: '12px',
          lineHeight: 1.45,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: `inset 0 0 12px ${severityTint}, 0 0 18px ${borderTint.replace(/[\d.]+\)$/, '0.35)')}`,
        }}
      >
        {topCounters.map(([name, value]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '14px',
              marginBottom: '1px',
            }}
          >
            <span style={{ opacity: 0.68, fontSize: '10px', textTransform: 'uppercase' }}>
              {shortLabel(name)}
            </span>
            <span style={{ fontWeight: 700, color: borderTint.replace(/[\d.]+\)$/, '0.95)') }}>
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>
    </Html>
  )
}
