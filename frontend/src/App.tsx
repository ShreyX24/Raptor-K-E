import { ChipScene } from '@/scene/ChipScene'
import { Breadcrumb } from '@/hud/Breadcrumb'
import { LoadTraceButton } from '@/hud/LoadTraceButton'

export default function App() {
  return (
    <div className="h-screen w-screen relative">
      {/* TMA-EXPERIMENTAL banner — surfaces the beta status per skill data-contract.md */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1 text-xs font-silicon
                      text-[oklch(0.78_0.18_220)]
                      border border-[oklch(0.78_0.18_220_/_0.4)]
                      bg-[oklch(0.20_0.022_250_/_0.78)]
                      rounded-md tracking-wider">
        TMA-EXPERIMENTAL · ARL
      </div>

      <Breadcrumb />
      <LoadTraceButton />

      <ChipScene />
    </div>
  )
}
