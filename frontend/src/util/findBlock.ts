/**
 * Walk the chip-spec taxonomy to find a BlockSpec by its dotted path.
 * Used by Choreographer (fitToBox target) and Breadcrumb HUD.
 *
 * BUG-006 follow-up: lookup also resolves synthesized `instanceOf` lanes
 * (e.g. `compute.p-core-0.frontend.decode.lane-3`). When the path enters an
 * instanced parent, we synthesize the lane spec on the fly so Breadcrumb /
 * Choreographer don't return undefined.
 */
import type { BlockSpec } from '@/data/chip-spec'

/** Mirror of packChildren.expandInstanceArray but returns one spec by index. */
function synthesizeInstance(parent: BlockSpec, laneId: string): BlockSpec | undefined {
  if (!parent.instanceOf || !parent.count || parent.count <= 0) return undefined
  const base = parent.instanceOf.split('.').pop() ?? 'lane'
  const expectedPrefix = `${parent.id}.${base}-`
  if (!laneId.startsWith(expectedPrefix)) return undefined
  const i = Number(laneId.slice(expectedPrefix.length))
  if (!Number.isInteger(i) || i < 0 || i >= parent.count) return undefined
  const labelStem = base.charAt(0).toUpperCase() + base.slice(1)
  return {
    id: laneId,
    label: `${labelStem} ${i}`,
    width: 0.6,
    depth: 0.6,
    height: 0.15,
  }
}

function findChild(parent: BlockSpec, id: string): BlockSpec | undefined {
  const direct = parent.children?.find((c) => c.id === id)
  if (direct) return direct
  return synthesizeInstance(parent, id)
}

export function findBlockSpec(root: BlockSpec, path: string[]): BlockSpec | undefined {
  let current: BlockSpec | undefined = root
  for (const id of path) {
    if (!current) return undefined
    current = findChild(current, id)
    if (!current) return undefined
  }
  return current
}

export function resolvePathChain(root: BlockSpec, path: string[]): BlockSpec[] {
  const chain: BlockSpec[] = []
  let current: BlockSpec | undefined = root
  for (const id of path) {
    if (!current) return []
    current = findChild(current, id)
    if (!current) return []
    chain.push(current)
  }
  return chain
}
