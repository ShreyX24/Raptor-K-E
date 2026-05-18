/**
 * Lion Cove board design spec — produced by Claude Design.
 *
 * Authoritative source: F:\Raptor-K-E\design-handoff\DESIGN-SPEC.json
 * Vite-importable copy:  ./design-spec.json (kept in sync with the handoff
 *                        folder; copy after each Claude Design iteration).
 * Schema:                F:\Raptor-K-E\design-handoff\DESIGN-SPEC-TEMPLATE.json
 */
import rawSpec from './design-spec.json'

export interface MaterialSpec {
  color: string
  emissive: string
  emissiveIntensity: number
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  envMapIntensity: number
  transparent: boolean
  opacity: number
}

export interface EdgeSpec {
  color: string
  lineWidth: number
  opacity: number
}

export interface BandSpec {
  material: MaterialSpec
  edge: EdgeSpec
  labelColor: string
  labelOutline: string
}

export interface BoardPlateSpec extends MaterialSpec {
  edge: EdgeSpec
}

export type BandName =
  | 'frontEndCaches'
  | 'decodeRow'
  | 'uopQueue'
  | 'allocateRename'
  | 'registerFiles'
  | 'vectorColumn'
  | 'vectorFill'
  | 'integerColumn'
  | 'integerFill'
  | 'storeDataColumn'
  | 'storeDataFill'
  | 'memoryColumn'
  | 'cacheStack'

export interface DesignSpec {
  background: { color: string; fogColor: string; fogNear: number; fogFar: number }
  lighting: {
    ambientIntensity: number
    directionalKey: { color: string; intensity: number; positionHint: string }
    rimCyan: { color: string; intensity: number; positionHint: string }
    fillCool: { color: string; intensity: number; positionHint: string }
  }
  boardPlate: BoardPlateSpec
  bands: Record<BandName, BandSpec>
  global: {
    bloomThreshold: number
    bloomStrength: number
    bloomRadius: number
    fontFamily: string
    labelOutlineWidth: number
  }
}

export const designSpec = rawSpec as unknown as DesignSpec

/**
 * Map a chip-spec cell id (the trailing segment after the last '.') to a
 * design band name. The taxonomy mirrors BAND-TAXONOMY.md exactly.
 *
 * Falls back to 'frontEndCaches' if the cell id is unknown (safe default —
 * darkest band, won't visually shout).
 */
export function bandFor(cellId: string): BandName {
  const id = cellId.split('.').pop() ?? ''

  if (id === 'itlb-icache' || id === 'bpu') return 'frontEndCaches'
  if (id === 'msrom' || id === 'decode' || id === 'uop-cache') return 'decodeRow'
  if (id === 'uop-queue') return 'uopQueue'
  if (id === 'allocate') return 'allocateRename'
  if (id === 'vec-rf' || id === 'int-rf') return 'registerFiles'

  if (
    id === 'vec-sched' ||
    id.startsWith('v-port-') ||
    id.startsWith('v-r') ||
    id.startsWith('v-fpdiv-')
  ) {
    return 'vectorColumn'
  }
  if (id === 'x87-mmx') return 'vectorFill'

  if (
    id === 'int-sched' ||
    id.startsWith('p-port-') ||
    id.startsWith('i-r') ||
    id.startsWith('i-mul-')
  ) {
    return 'integerColumn'
  }
  if (id === 'misc') return 'integerFill'

  if (id === 'sto-sched' || id.startsWith('sd-port-')) return 'storeDataColumn'
  if (id === 'store-data') return 'storeDataFill'

  if (
    id === 'mem-sched' ||
    id.startsWith('m-port-') ||
    id.startsWith('m-r')
  ) {
    return 'memoryColumn'
  }
  if (id === 'l0d' || id === 'l1d' || id === 'l2') return 'cacheStack'

  return 'frontEndCaches' // safe fallback
}
