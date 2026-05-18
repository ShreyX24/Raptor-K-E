/**
 * IHSText — engraved-style labels on the IHS top face.
 *
 * Phase 4 Act 1: uses drei `<Text>` (SDF-rendered 3D text) so the labels stick
 * to the IHS mesh and rotate with it during the delid lift. drei <Html> would
 * be screen-aligned which is wrong for this — we want the label to appear
 * engraved into the metal lid.
 *
 * Reference: F:\Raptor-K-E\reference images\processor-s-l400.jpg
 *   "INTEL CORE ULTRA 9 / 285K / SRQDS / L537F370"
 *
 * Lines (top → bottom, north → south on the lid):
 *   - silicon family (small, top-of-lid)
 *   - CPU SKU (large, center-of-lid — the hero label)
 *   - batch ID (small, bottom-of-lid)
 *
 * Anti-patterns avoided:
 *   - drei <Text> is GPU-rendered via troika-three-text; no DOM cost
 *   - color matches engraved-on-metal look (light gray, no emissive)
 */
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useStore } from '@/state/store'
import { SILICON_FONT_URL } from './fonts'

interface IHSTextProps {
  /** Y of the IHS top face (lid center + lid height/2). Text floats just above. */
  topY: number
  /** width of the IHS (X) — labels stay inside the lid by ~85% */
  width: number
  /** depth of the IHS (Z) — text positions itself along this axis */
  depth: number
}

// Slightly above the lid top face so it doesn't z-fight with the metal surface
const TEXT_LIFT = 0.02

const ENGRAVE_COLOR = '#a8b0bd' // light gray — reads as engraved on dark nickel
const ACCENT_COLOR = '#7ec9ff' // cyan — for the silicon family line

export function IHSText({ topY, width, depth }: IHSTextProps) {
  const siliconFamily = useStore((s) => s.siliconFamily)
  const cpuSku = useStore((s) => s.cpuSku)
  const batchId = useStore((s) => s.batchId)
  const bootState = useStore((s) => s.bootState)

  if (bootState === 'delidded') return null

  // Rotation [-π/2, 0, 0] lays the XY text plane down on the XZ lid surface,
  // BUT it maps local +Y → world -Z (north / top of screen). So positions that
  // should appear at the NORTH edge of the lid use POSITIVE Y here, and positions
  // at the SOUTH edge use NEGATIVE Y.
  return (
    <group position={[0, topY + TEXT_LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* "intel" wordmark — very top (north) */}
      <Text
        position={[0, depth * 0.42, 0]}
        font={SILICON_FONT_URL}
        fontSize={width * 0.05}
        color={ENGRAVE_COLOR}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.3}
        outlineWidth={0.0015}
        outlineColor="#000000"
      >
        intel
      </Text>

      {/* Silicon family — small accent, top quarter */}
      <Text
        position={[0, depth * 0.32, 0]}
        font={SILICON_FONT_URL}
        fontSize={width * 0.06}
        color={ACCENT_COLOR}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
        outlineWidth={0.002}
        outlineColor="#001830"
      >
        {siliconFamily.toUpperCase()}
      </Text>

      {/* CPU SKU — large, centered (the hero label) */}
      <Text
        position={[0, 0, 0]}
        font={SILICON_FONT_URL}
        fontSize={width * 0.085}
        color={ENGRAVE_COLOR}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        maxWidth={width * 0.85}
        textAlign="center"
        outlineWidth={0.003}
        outlineColor="#000000"
      >
        {cpuSku}
      </Text>

      {/* Batch ID — bottom quarter (south) */}
      <Text
        position={[0, -depth * 0.36, 0]}
        font={SILICON_FONT_URL}
        fontSize={width * 0.04}
        color="#6c7280"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.2}
        outlineWidth={0.0015}
        outlineColor="#000000"
      >
        {batchId}
      </Text>
    </group>
  )
}

// Pre-load Three.js to avoid a tree-shake warning since Text uses it
void THREE.Color
