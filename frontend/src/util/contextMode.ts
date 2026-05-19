/**
 * Context-mode helpers.
 *
 * A "context-entering" block (BlockSpec.enterContext === true) opens a fresh
 * viewport when it becomes the deepest focus. Everything outside its subtree
 * unmounts — Base, IHS, L0 chiplets, ancestor Blocks all hide — so only the
 * board (the focused block's children) is on screen, plus a name plate.
 *
 * The "context block" is the INNERMOST (deepest) block in focusPath that has
 * enterContext. With both Compute Tile (L1 board via ComputeBoardProjector)
 * and its P-core children (L2 Lion Cove board via ContextProjector) flagged
 * enterContext, the user drilling Compute → P-core needs the P-core (inner)
 * context to take over so the Lion Cove board replaces the Compute board.
 */
import { chipSpec, type BlockSpec } from '@/data/chip-spec'
import { findBlockSpec, resolvePathChain } from './findBlock'

export interface ContextInfo {
  /** True when any block in focusPath has enterContext set. */
  active: boolean
  /** The enterContext block (anchor of the context). Undefined when inactive. */
  block?: BlockSpec
  /** Index of the context block within focusPath (so anything at higher index is "inside" the context). */
  depth?: number
  /** Full id-path of the context block, for sub-tree membership checks. */
  path?: string[]
}

export function computeContextInfo(focusPath: string[]): ContextInfo {
  if (focusPath.length === 0) return { active: false }
  const chain = resolvePathChain(chipSpec, focusPath)
  if (chain.length === 0) return { active: false }
  // INNERMOST wins — scan from the deepest end. Lets P-core (Lion Cove board)
  // take over from Compute (L1 floorplan board) once the user drills past it.
  let idx = -1
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].enterContext === true) {
      idx = i
      break
    }
  }
  if (idx < 0) return { active: false }
  return {
    active: true,
    block: chain[idx],
    depth: idx,
    path: focusPath.slice(0, idx + 1),
  }
}

/**
 * True if `candidatePath` is the context block itself OR strictly inside its subtree.
 * Used to decide which Block instances stay visible in context mode.
 */
export function isInsideContext(
  candidatePath: string[],
  contextPath: string[] | undefined,
): boolean {
  if (!contextPath) return false
  if (candidatePath.length < contextPath.length) return false
  for (let i = 0; i < contextPath.length; i++) {
    if (candidatePath[i] !== contextPath[i]) return false
  }
  return true
}

// Re-export for convenience
export { findBlockSpec }
