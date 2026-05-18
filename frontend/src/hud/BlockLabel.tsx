/**
 * BlockLabel — name plate engraved on the top face of any block.
 *
 * Renders the block's label as flat 3D text using the silicon font
 * (IntelOne Display Bold). Anchored to the block's top face, rotated -90°
 * around X so it lies flat (matches engraved-on-metal aesthetic, same as
 * IHSText). Sized proportionally to the block's footprint.
 *
 * Mounted by Block.tsx for every visible block. Hidden when the block is
 * a sibling-fade or ancestor-ghost (no labels on dim blocks) and during
 * the IHS boot screen (no labels on hidden chiplets).
 *
 * Performance: drei <Text> via troika-three-text uses SDF rendering with
 * one geometry per text instance — cheap enough for the ~30 labels visible
 * at the deepest drill level.
 */
import { Text } from '@react-three/drei'

import { SILICON_FONT_URL } from './fonts'

interface BlockLabelProps {
  label: string
  /** Block's local-frame top-face Y (height/2). */
  topY: number
  /** Block footprint width (X). */
  width: number
  /** Block footprint depth (Z). */
  depth: number
  /** Color of the engraved text. Default = light gray. */
  color?: string
  /** Override text size — defaults to a fraction of min(width, depth). */
  fontSize?: number
}

const TEXT_LIFT = 0.012 // float just above the top face to avoid z-fighting

export function BlockLabel({
  label,
  topY,
  width,
  depth,
  color = '#cfd6e2',
  fontSize,
}: BlockLabelProps) {
  // Auto-size based on the block's smaller axis so the label fits in landscape
  // or portrait blocks without overflowing. Smaller multiplier than IHSText
  // because chiplet blocks are densely packed and text on neighbors must not
  // collide. The minWidth cap keeps L3 slices and lanes readable.
  const autoSize = Math.min(width, depth) * 0.13
  const finalSize = fontSize ?? Math.max(0.05, autoSize)
  const maxLabelWidth = Math.max(width, depth) * 0.82

  return (
    <group position={[0, topY + TEXT_LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Text
        font={SILICON_FONT_URL}
        fontSize={finalSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        maxWidth={maxLabelWidth}
        textAlign="center"
        outlineWidth={finalSize * 0.04}
        outlineColor="#000814"
      >
        {label}
      </Text>
    </group>
  )
}
