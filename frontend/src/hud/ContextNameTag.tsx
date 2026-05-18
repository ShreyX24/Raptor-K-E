/**
 * ContextNameTag — hardware-nameplate trapezoid anchored to the bottom edge.
 *
 * Visible only in context mode. Visually represents "the P-core (the
 * trapezoid base anchored at the bottom edge) projecting its internal ISA
 * structure onto the board above". The trapezoid widens going UP — narrower
 * at the screen bottom (the chiplet itself), wider at the top edge (the
 * "projection surface" connecting to the board).
 *
 * Reference: F:\Raptor-K-E\reference images\Screenshot 2026-05-18 221521.png
 * (the user's hand-drawn mockup showing this exact shape under the board).
 *
 * Two-layer build:
 *  - Outer `<div>`: trapezoid border + glow via clip-path on a gradient bg
 *  - Inner `<div>`: slightly inset darker fill for the bezel effect
 *  - Content: "P-core #N · Lion Cove" in IntelOne Display Bold + small CONTEXT eyebrow
 */
import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'

// Trapezoid geometry — wider at the TOP (projection surface), narrower at the
// BOTTOM (chiplet base). Clipped via polygon().
const TRAPEZOID_OUTER =
  'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)'
const TRAPEZOID_INNER =
  'polygon(1.5% 8%, 98.5% 8%, 87% 94%, 13% 94%)'

export function ContextNameTag() {
  const focusPath = useStore((s) => s.focusPath)
  const context = computeContextInfo(focusPath)

  if (!context.active || !context.block) return null

  return (
    <div
      className="absolute left-1/2 bottom-0 -translate-x-1/2 z-10 pointer-events-none"
      style={{ width: '520px', height: '110px' }}
    >
      {/* Outer trapezoid — cyan gradient edge that doubles as the bezel border */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: TRAPEZOID_OUTER,
          background:
            'linear-gradient(180deg, oklch(0.78 0.18 220) 0%, oklch(0.55 0.16 235) 60%, oklch(0.42 0.10 240) 100%)',
          filter: 'drop-shadow(0 0 22px rgba(0,178,255,0.30)) drop-shadow(0 0 50px rgba(0,178,255,0.12))',
        }}
      />
      {/* Inner trapezoid — dark fill */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: TRAPEZOID_INNER,
          background:
            'linear-gradient(180deg, oklch(0.14 0.025 250 / 0.96) 0%, oklch(0.08 0.02 250 / 0.98) 100%)',
        }}
      />
      {/* Text content — centered inside the inner trapezoid */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center
                   font-silicon text-[oklch(0.92_0.02_240)] tracking-wider
                   pointer-events-auto"
      >
        <div className="text-[9px] uppercase tracking-[0.32em] opacity-55 mb-1">
          Context
        </div>
        <div className="text-base font-bold text-[oklch(0.88_0.18_220)]">
          {context.block.label}
        </div>
      </div>
    </div>
  )
}
