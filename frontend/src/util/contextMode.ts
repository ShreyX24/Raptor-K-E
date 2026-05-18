/**
 * Context-mode helpers.
 *
 * A "context-entering" block (BlockSpec.enterContext === true) opens a fresh
 * viewport when it becomes the deepest focus. Everything outside its subtree
 * unmounts — Base, IHS, L0 chiplets, ancestor Blocks all hide — so only the
 * board (the focused block's children) is on screen, plus a name plate.
 *
 * The "context block" is the FIRST block in focusPath that has enterContext.
 * If multiple ancestors had the flag (unusual), the outermost wins so nested
 * contexts don't unmount each other.
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
  const idx = chain.findIndex((b) => b.enterContext === true)
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
