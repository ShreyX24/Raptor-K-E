/**
 * Walk the chip-spec taxonomy to find a BlockSpec by its dotted path.
 * Used by Choreographer (fitToBox target) and Breadcrumb HUD.
 */
import type { BlockSpec } from '@/data/chip-spec'

/**
 * Find a BlockSpec by walking a path of block ids from the root downward.
 * Returns the spec at the end of the path, or undefined if any segment is missing.
 */
export function findBlockSpec(root: BlockSpec, path: string[]): BlockSpec | undefined {
  let current: BlockSpec | undefined = root
  for (const id of path) {
    if (!current?.children) return undefined
    current = current.children.find((c) => c.id === id)
    if (!current) return undefined
  }
  return current
}

/**
 * Resolve a path into a chain of BlockSpecs from root to leaf. Used by
 * Breadcrumb to label each crumb. Returns empty array on miss at any level.
 */
export function resolvePathChain(root: BlockSpec, path: string[]): BlockSpec[] {
  const chain: BlockSpec[] = []
  let current: BlockSpec | undefined = root
  for (const id of path) {
    if (!current?.children) return []
    current = current.children.find((c) => c.id === id)
    if (!current) return []
    chain.push(current)
  }
  return chain
}
