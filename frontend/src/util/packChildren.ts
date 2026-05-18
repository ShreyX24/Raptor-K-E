/**
 * Grid-pack a list of child BlockSpecs into a parent's footprint.
 *
 * Phase 3 minimum-viable layout algorithm: divide parent footprint into a
 * roughly-square grid (cols ≈ ceil(sqrt(N))), assign each child to a cell.
 * Children don't use their own width/depth values — they fill their cell with
 * a small padding gutter. The result is readable hover targets at every drill
 * level without bespoke per-tile layout code.
 *
 * Returns world-space (x, z) centers + (w, d) sizes — caller adds Y.
 */
import type { BlockSpec } from '@/data/chip-spec'

export interface PackedChild {
  child: BlockSpec
  x: number
  z: number
  w: number
  d: number
}

const PADDING = 0.18 // gutter between adjacent cells

export function packChildren(
  children: BlockSpec[],
  centerX: number,
  centerZ: number,
  totalW: number,
  totalD: number,
): PackedChild[] {
  const n = children.length
  if (n === 0) return []

  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const cellW = totalW / cols
  const cellD = totalD / rows

  return children.map((child, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    const x = centerX - totalW / 2 + cellW * (c + 0.5)
    const z = centerZ - totalD / 2 + cellD * (r + 0.5)
    return {
      child,
      x,
      z,
      w: Math.max(0.5, cellW - PADDING * 2),
      d: Math.max(0.5, cellD - PADDING * 2),
    }
  })
}
