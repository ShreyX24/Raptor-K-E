/**
 * Grid-pack a list of child BlockSpecs into a parent's footprint.
 *
 * Phase 3 minimum-viable layout algorithm: divide parent footprint into a
 * roughly-square grid (cols ≈ ceil(sqrt(N))), assign each child to a cell.
 * Children don't use their own width/depth values — they fill their cell with
 * a small padding gutter. The result is readable hover targets at every drill
 * level without bespoke per-tile layout code.
 *
 * BUG-006 fix: a block can declare `instanceOf` + `count` to mean "I am a
 * 1-of-N instanced array of identical sub-units" (e.g. Lion Cove decode is
 * 8-wide, exec is 18 ports). `expandInstanceArray` synthesizes the N children
 * so drilling into the parent reveals the lanes per LAYER-PLAN.md.
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

/**
 * If a parent has `instanceOf`/`count` (e.g. decode×8), synthesize N child
 * BlockSpecs with derived ids (`parent.lane-0` ... `parent.lane-N-1`).
 *
 * If the parent ALSO has explicit children, the explicit ones win and the
 * instance array is ignored — explicit always trumps generated.
 */
export function expandInstanceArray(parent: BlockSpec): BlockSpec[] {
  if (parent.children?.length) return parent.children
  if (!parent.instanceOf || !parent.count || parent.count <= 0) return []

  const base = parent.instanceOf.split('.').pop() ?? 'lane'
  const labelStem = humanizeBase(base)
  return Array.from({ length: parent.count }, (_, i) => ({
    id: `${parent.id}.${base}-${i}`,
    label: `${labelStem} ${i}`,
    width: 0.6,
    depth: 0.6,
    height: 0.15,
  }))
}

function humanizeBase(base: string): string {
  // 'decode.lane' → already split to 'lane'; capitalize first letter
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Lay children out inside a parent's footprint.
 *
 *   - If parent's `layout === 'manual'`: use each child's explicit
 *     `localX`/`localZ` (relative to parent center) and the child's own
 *     `width`/`depth`. No padding adjustment — the spec author owns the gaps.
 *   - Otherwise: grid-pack into ceil(sqrt(N)) columns, equal cell sizes.
 *
 * For instanced parents (`instanceOf` + `count`), `expandInstanceArray` runs
 * before this and produces a regular children array, so they get the grid path.
 */
export function layoutChildren(
  parent: BlockSpec,
  children: BlockSpec[],
  centerX: number,
  centerZ: number,
  totalW: number,
  totalD: number,
): PackedChild[] {
  if (parent.layout === 'manual') {
    return children.map((child) => ({
      child,
      x: centerX + (child.localX ?? 0),
      z: centerZ + (child.localZ ?? 0),
      w: child.width,
      d: child.depth,
    }))
  }
  return packChildren(children, centerX, centerZ, totalW, totalD)
}

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
