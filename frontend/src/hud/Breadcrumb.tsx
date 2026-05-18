/**
 * Breadcrumb — DOM HUD chrome that shows focusPath as clickable crumbs.
 *
 * Per skill references/aesthetic.md: dark glassmorphic, Geist font, cyan accent
 * for the leaf crumb. The skill anti-pattern is `backdrop-filter: blur(>8px)`
 * over the canvas — we use blur(6px) which is safe.
 *
 * Click a crumb → focus to that path (truncates focusPath). Clicking the root
 * "Arrow Lake" crumb resets to the L0 view.
 *
 * Esc handler is colocated here because the breadcrumb is the visible affordance
 * for popping the focus stack.
 */
import { useEffect, useMemo } from 'react'

import { useStore } from '@/state/store'
import { chipSpec } from '@/data/chip-spec'
import { resolvePathChain } from '@/util/findBlock'

export function Breadcrumb() {
  const focusPath = useStore((s) => s.focusPath)
  const focus = useStore((s) => s.focus)
  const popFocus = useStore((s) => s.popFocus)

  // Resolve the chain of BlockSpecs from root to leaf for labels
  const chain = useMemo(() => resolvePathChain(chipSpec, focusPath), [focusPath])

  // Global Esc → pop focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusPath.length > 0) {
        e.preventDefault()
        popFocus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusPath.length, popFocus])

  if (focusPath.length === 0) return null

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10
                 flex items-center gap-1 px-4 py-2
                 text-xs font-silicon tracking-wide
                 text-[oklch(0.92_0.02_240)]
                 bg-[oklch(0.12_0.02_250_/_0.65)]
                 border border-[oklch(0.78_0.18_220_/_0.35)]
                 rounded-md
                 backdrop-blur-[6px]
                 shadow-[0_0_24px_rgba(0,178,255,0.08)]"
    >
      <button
        onClick={() => focus([])}
        className="text-[oklch(0.70_0.04_250)] hover:text-[oklch(0.78_0.18_220)]
                   transition-colors px-1.5 py-0.5 rounded"
        aria-label="Reset to L0 (Arrow Lake overview)"
      >
        Arrow Lake
      </button>

      {chain.map((block, i) => {
        const isLast = i === chain.length - 1
        return (
          <span key={block.id} className="flex items-center gap-1">
            <span className="text-[oklch(0.45_0.02_250)] select-none">›</span>
            <button
              onClick={() => focus(focusPath.slice(0, i + 1))}
              disabled={isLast}
              className={
                isLast
                  ? 'text-[oklch(0.78_0.18_220)] px-1.5 py-0.5 rounded cursor-default'
                  : 'text-[oklch(0.70_0.04_250)] hover:text-[oklch(0.78_0.18_220)] transition-colors px-1.5 py-0.5 rounded'
              }
              aria-current={isLast ? 'page' : undefined}
              aria-label={`Focus to ${block.label}`}
            >
              {block.label}
            </button>
          </span>
        )
      })}

      <span className="ml-2 pl-2 border-l border-[oklch(0.30_0.02_250)]
                       text-[oklch(0.50_0.02_250)] text-[10px]">
        Esc to pop
      </span>
    </div>
  )
}
