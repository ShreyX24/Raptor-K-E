/**
 * ContextNameTag — name plate at the bottom of the viewport identifying which
 * context block the user is currently inside (e.g. "P Core #1 · Lion Cove").
 *
 * Visible only when context mode is active (a focused ancestor has
 * `enterContext: true` in its BlockSpec). Styled like a hardware name plate:
 * dark glass with a cyan-accent border, Intel One Display Bold.
 *
 * Reference: F:\Raptor-K-E\reference images\Screenshot 2026-05-18 221521.png
 * (the user's hand-drawn mockup showing the "P Core #1" tag below the board)
 */
import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'

export function ContextNameTag() {
  const focusPath = useStore((s) => s.focusPath)
  const context = computeContextInfo(focusPath)

  if (!context.active || !context.block) return null

  return (
    <div
      className="absolute left-1/2 bottom-12 -translate-x-1/2 z-10
                 px-6 py-2.5
                 text-sm font-silicon tracking-wider
                 text-[oklch(0.92_0.02_240)]
                 bg-[oklch(0.10_0.02_250_/_0.78)]
                 border border-[oklch(0.78_0.18_220_/_0.45)]
                 rounded-md
                 backdrop-blur-[7px]
                 shadow-[0_0_22px_rgba(0,178,255,0.18),inset_0_0_18px_rgba(0,178,255,0.06)]"
      style={{
        // Trapezoid clip — name-plate aesthetic from the user's mockup
        clipPath:
          'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.25em] opacity-55 mb-0.5 text-center">
        Context
      </div>
      <div className="font-bold text-[oklch(0.85_0.18_220)] text-center">
        {context.block.label}
      </div>
    </div>
  )
}
