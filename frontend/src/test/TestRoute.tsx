/**
 * TestRoute — wrapper for the /test endpoint. Renders TestCuboid full-screen
 * with a header strip naming the coordinate vocabulary, plus a Free-Camera
 * toggle so the user can fly around with WASD / Space / Ctrl when ORBIT
 * mode's single-focus framing gets in the way.
 *
 * Activated by `window.location.pathname === '/test'` in App.tsx, so no
 * router dependency is needed.
 */
import { useState } from 'react'

import { TestCuboid } from './TestCuboid'

export function TestRoute() {
  const [freeCamera, setFreeCamera] = useState(false)

  return (
    <div className="h-screen w-screen relative bg-[oklch(0.10_0.02_250)]">
      <div
        className="absolute top-0 left-0 right-0 z-10
                   flex items-center justify-between gap-4 px-5 py-2.5
                   text-xs font-silicon tracking-wide
                   text-[oklch(0.92_0.02_240)]
                   bg-[oklch(0.12_0.02_250_/_0.78)]
                   border-b border-[oklch(0.78_0.18_220_/_0.35)]
                   backdrop-blur-[6px]"
      >
        <span className="font-bold text-[oklch(0.78_0.18_220)]">
          /test · CPU Tile Coordinate Reference
        </span>

        <span className="text-[10px] opacity-70">
          <span className="text-[#ffe066]">V1–V8</span> vertices ·{' '}
          <span className="text-[#7fffd4]">E1–E12</span> edges ·{' '}
          <span className="text-[#ff7eb6]">S1–S6</span> surfaces ·{' '}
          drag to orbit, scroll to zoom
        </span>

        {/* Free-camera toggle. When ON: WASD pans on the horizontal plane
            relative to view, Space lifts, Shift drops. Mouse orbit still works.
            (Ctrl avoided — Ctrl+W would close the tab.) */}
        <button
          type="button"
          onClick={() => setFreeCamera((p) => !p)}
          className={[
            'px-3 py-1 rounded border text-[11px] font-bold tracking-wider',
            'transition-colors duration-150',
            freeCamera
              ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#cffafe] hover:bg-[#22d3ee]/25'
              : 'bg-transparent border-[oklch(0.78_0.18_220_/_0.45)] text-[oklch(0.92_0.02_240)] hover:bg-[oklch(0.78_0.18_220_/_0.10)]',
          ].join(' ')}
          title="Toggle free-camera (WASD pan, Space up, Shift down). Mouse orbit always works."
        >
          {freeCamera ? '◉ Camera: FREE  ·  W A S D · Space · Shift' : '○ Camera: ORBIT'}
        </button>
      </div>

      <TestCuboid freeCamera={freeCamera} />
    </div>
  )
}
