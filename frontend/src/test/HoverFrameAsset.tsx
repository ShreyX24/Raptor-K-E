/**
 * HoverFrameAsset — asset 03 in /test.
 *
 * Hover state per Presentation1_page-0007.jpg:
 *   - A group of tile(s) (here a single tile for clarity) is LIFTED above
 *     the resting plane
 *   - A bright cyan rectangular RING floats just above the lifted tile's
 *     top face — the "selection frame"
 *   - The lifted tile is slightly more illuminated than its resting peers
 *
 * NOT to be confused with the highlight state (asset 01) — highlight is the
 * full glowing-side open-box look. Hover is more restrained: same tile body
 * style as resting + frame + lift.
 *
 * Layout: resting | HOVER | resting → so the differential is visible at a
 * glance.
 */
import { RoundedBox, Text } from '@react-three/drei'

import { SILICON_FONT_URL } from '@/hud/fonts'
import { useSubstrateTexture } from './substrateTexture'

// Tile + layout dims for the asset-03 demo
const TILE_W = 3.0
const TILE_H = 0.25
const TILE_D = 3.0
const TILE_GAP = 0.40

const TILE_COLOR    = '#0ea5b7'
const TILE_EMISSIVE = '#0a5a6a'

// How much the hover tile pops up above the substrate
const HOVER_LIFT = 0.55

// Substrate just under the resting plane
const SUBSTRATE_W   = TILE_W * 3 + TILE_GAP * 2 + 1.4
const SUBSTRATE_D   = TILE_D + 1.4
const SUBSTRATE_THK = 0.35
const SUBSTRATE_Y   = -(TILE_H / 2) - (SUBSTRATE_THK / 2) - 0.01

// Cyan frame ring dims
const RING_PAD   = 0.42   // ring extends this much beyond tile in x/z
const RING_THK   = 0.06   // rod thickness (square section)
const RING_GAP_Y = 0.07   // ring sits this far above the lifted tile's top face
const RING_COLOR = '#22d3ee'

interface TileProps {
  x: number
  label: string
  hovered: boolean
}

function Tile({ x, label, hovered }: TileProps) {
  const lift = hovered ? HOVER_LIFT : 0
  return (
    <group position={[x, lift, 0]}>
      <RoundedBox
        args={[TILE_W, TILE_H, TILE_D]}
        radius={0.04}
        smoothness={4}
        creaseAngle={0.4}
      >
        <meshPhysicalMaterial
          color={TILE_COLOR}
          roughness={0.45}
          metalness={0.05}
          transmission={hovered ? 0.40 : 0.55}
          ior={1.45}
          thickness={0.4}
          attenuationDistance={2.5}
          attenuationColor={TILE_COLOR}
          clearcoat={0.65}
          clearcoatRoughness={0.35}
          envMapIntensity={0.65}
          emissive={TILE_EMISSIVE}
          emissiveIntensity={hovered ? 0.80 : 0.35}
          transparent
          opacity={hovered ? 0.94 : 0.85}
        />
      </RoundedBox>

      <Text
        position={[0, TILE_H / 2 + 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color={hovered ? '#ecfeff' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        outlineWidth={0.05}
        outlineColor="#03061a"
        material-toneMapped={false}
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * Bright cyan rectangular ring — 4 thin neon rods at the lifted tile's
 * top-face level. Using boxGeometry instead of <Line> so the "neon" reads
 * consistently across camera angles and bloom-free rendering.
 */
function CyanFrameRing({
  position,
  width,
  depth,
}: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  const hw = width / 2
  const hd = depth / 2
  // Each rod is a thin box centred on its edge of the rectangle
  const rods: { p: [number, number, number]; s: [number, number, number] }[] = [
    // front edge (+z)
    { p: [0, 0, +hd], s: [width + RING_THK, RING_THK, RING_THK] },
    // back edge (-z)
    { p: [0, 0, -hd], s: [width + RING_THK, RING_THK, RING_THK] },
    // left edge (-x)
    { p: [-hw, 0, 0], s: [RING_THK, RING_THK, depth + RING_THK] },
    // right edge (+x)
    { p: [+hw, 0, 0], s: [RING_THK, RING_THK, depth + RING_THK] },
  ]
  return (
    <group position={position}>
      {rods.map((r, i) => (
        <mesh key={i} position={r.p}>
          <boxGeometry args={r.s} />
          <meshBasicMaterial color={RING_COLOR} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export function HoverFrameAsset() {
  const substrateMap = useSubstrateTexture()

  // Centre the row of 3 tiles around x=0
  const xLeft   = -(TILE_W + TILE_GAP)
  const xMid    = 0
  const xRight  = +(TILE_W + TILE_GAP)

  return (
    <group>
      {/* Section labels */}
      <Text
        position={[0, 3.5, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.75}
        color="#cfd6ff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        HOVER
      </Text>
      <Text
        position={[0, 2.7, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color="#a5b3e5"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        outlineWidth={0.035}
        outlineColor="#001020"
      >
        asset 03 · cyan ring + lift (page-007)
      </Text>

      {/* Substrate */}
      <RoundedBox
        position={[0, SUBSTRATE_Y, 0]}
        args={[SUBSTRATE_W, SUBSTRATE_THK, SUBSTRATE_D]}
        radius={0.06}
        smoothness={3}
        creaseAngle={0.4}
      >
        <meshStandardMaterial
          color="#0a1224"
          roughness={0.55}
          metalness={0.25}
          emissive="#ffffff"
          emissiveMap={substrateMap}
          emissiveIntensity={0.80}
        />
      </RoundedBox>

      {/* Tiles — resting | HOVER | resting */}
      <Tile x={xLeft}  label="RESTING" hovered={false} />
      <Tile x={xMid}   label="HOVER"   hovered={true}  />
      <Tile x={xRight} label="RESTING" hovered={false} />

      {/* Cyan frame ring around the lifted hover tile */}
      <CyanFrameRing
        position={[xMid, HOVER_LIFT + TILE_H / 2 + RING_GAP_Y, 0]}
        width={TILE_W + RING_PAD * 2}
        depth={TILE_D + RING_PAD * 2}
      />
    </group>
  )
}
