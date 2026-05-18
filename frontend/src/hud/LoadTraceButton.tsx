/**
 * LoadTraceButton — dev-only affordance to fire the delid animation.
 *
 * Visible only in `bootState === 'lidded'` AND `import.meta.env.DEV`. Clicking
 * loads `mockTrace`, which the store's `loadTrace` action uses to flip
 * `bootState` to 'delidding' (and the camera + IHS animations cascade from there).
 *
 * In production this is replaced by the real backend pushing a trace via SSE/WS.
 */
import { useStore } from '@/state/store'
import { mockTrace } from '@/data/mockTrace'

export function LoadTraceButton() {
  const bootState = useStore((s) => s.bootState)
  const loadTrace = useStore((s) => s.loadTrace)

  if (!import.meta.env.DEV) return null
  if (bootState !== 'lidded') return null

  return (
    <button
      onClick={() => loadTrace(mockTrace)}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                 px-5 py-2.5 text-sm font-silicon
                 text-[oklch(0.92_0.02_240)]
                 bg-[oklch(0.18_0.04_250_/_0.85)]
                 border border-[oklch(0.78_0.18_220_/_0.5)]
                 hover:bg-[oklch(0.22_0.06_250_/_0.95)]
                 hover:border-[oklch(0.78_0.18_220_/_0.9)]
                 hover:text-[oklch(0.96_0.04_240)]
                 active:translate-y-px
                 transition-all
                 rounded-md
                 backdrop-blur-[6px]
                 shadow-[0_0_16px_rgba(0,178,255,0.18)]
                 tracking-wide"
    >
      ▸ Load trace · delid
    </button>
  )
}
