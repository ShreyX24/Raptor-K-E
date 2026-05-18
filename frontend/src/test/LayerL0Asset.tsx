/**
 * LayerL0Asset — first item in the /test "LAYERS" row.
 *
 * L0 = the base substrate + 4 chiplets in their physical 4-quadrant
 * floorplan per LAYER-PLAN.md §L0:
 *
 *   ┌──────────────────┬──────────────────┐  (top half = north = -Z)
 *   │  COMPUTE  (TL)   │   GPU      (TR)  │
 *   │  N3B, 117 mm²    │   N5(P), 23 mm²  │
 *   ├──────────────────┼──────────────────┤
 *   │  IOE      (BL)   │   SoC      (BR)  │  (bottom half = south = +Z)
 *   │  N6, 24 mm²      │   N6, 87 mm²     │
 *   └──────────────────┴──────────────────┘
 *
 * Per LAYER-PLAN.md user direction: actual mm² areas are NOT preserved —
 * placement matters, not relative size. We render a balanced 4-quadrant
 * grid with equal-footprint chiplets so each is hover-targetable.
 *
 * Chiplet material reuses the frosted-glass look from asset 02 (RestingTile)
 * — at L0 the chiplets are in their resting / un-drilled state.
 *
 * Drill semantics (future): clicking COMPUTE pushes focusPath → L1 layer
 * rises. In /test this asset is purely a layout reference.
 */
import { RoundedBox, Text } from '@react-three/drei'

import { SILICON_FONT_URL } from '@/hud/fonts'
import { useSubstrateTexture } from './substrateTexture'

interface ChipletDef {
  id: string
  label: string
  x: number
  z: number
  /** Frosted-glass tint */
  color: string
  /** Subtle internal glow tied to color */
  emissive: string
}

// Base tile (substrate / interposer) — 16 × 0.8 × 12 per LAYER-PLAN §L0
const BASE_W = 16
const BASE_H = 0.8
const BASE_D = 12

// Each chiplet (4 equal-footprint quadrants, ignoring real-mm² ratio per spec)
const TILE_W = 7
const TILE_H = 0.6
const TILE_D = 5

// Small gap between adjacent chiplets so the 4-quadrant boundary reads cleanly
const TILE_GAP = 0.4

// Chiplet vertical position — sitting on the base top
const TILE_Y = BASE_H / 2 + TILE_H / 2 + 0.02

// Half-pitch from chip centre to each quadrant centre
const X_PITCH = TILE_W / 2 + TILE_GAP / 2 // = 3.7
const Z_PITCH = TILE_D / 2 + TILE_GAP / 2 // = 2.7

// 4 chiplets — colours chosen to distinguish each tile cleanly while staying
// in a "circuit" palette: cool blues for the compute/GPU side, warm amber +
// purple for the I/O + SoC side.
const CHIPLETS: ChipletDef[] = [
  // TOP-LEFT (north / -Z) — Compute Tile: heavy lifter, deep saturated blue
  { id: 'compute', label: 'COMPUTE', x: -X_PITCH, z: -Z_PITCH, color: '#1d4ed8', emissive: '#0a2782' },
  // TOP-RIGHT — GPU Tile: cyan-teal
  { id: 'gpu',     label: 'GPU',     x: +X_PITCH, z: -Z_PITCH, color: '#0d9488', emissive: '#0a4d44' },
  // BOTTOM-LEFT — IOE Tile: warm amber (I/O signal feel)
  { id: 'ioe',     label: 'IOE',     x: -X_PITCH, z: +Z_PITCH, color: '#c2410c', emissive: '#5e1e07' },
  // BOTTOM-RIGHT — SoC Tile: violet (hub of NPU/IMC/fabric)
  { id: 'soc',     label: 'SoC',     x: +X_PITCH, z: +Z_PITCH, color: '#7c3aed', emissive: '#3b1485' },
]

export function LayerL0Asset() {
  const substrateMap = useSubstrateTexture()

  return (
    <group>
      {/* Section labels */}
      <Text
        position={[0, 5.0, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.95}
        color="#cfeaff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
        outlineWidth={0.06}
        outlineColor="#000000"
      >
        L0
      </Text>
      <Text
        position={[0, 4.0, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.45}
        color="#9fc8e8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        outlineWidth={0.035}
        outlineColor="#001020"
      >
        base substrate + 4 chiplets (Compute · GPU · IOE · SoC)
      </Text>

      {/* Base tile (Intel 22FFL active interposer) — top face textured */}
      <RoundedBox
        args={[BASE_W, BASE_H, BASE_D]}
        radius={0.08}
        smoothness={3}
        creaseAngle={0.4}
      >
        <meshStandardMaterial
          color="#0a1224"
          roughness={0.55}
          metalness={0.25}
          emissive="#ffffff"
          emissiveMap={substrateMap}
          emissiveIntensity={0.70}
        />
      </RoundedBox>

      {/* The 4 chiplets in 4-quadrant grid */}
      {CHIPLETS.map((c) => (
        <group key={c.id} position={[c.x, TILE_Y, c.z]}>
          <RoundedBox
            args={[TILE_W, TILE_H, TILE_D]}
            radius={0.05}
            smoothness={4}
            creaseAngle={0.4}
          >
            <meshPhysicalMaterial
              color={c.color}
              roughness={0.45}
              metalness={0.05}
              transmission={0.45}
              ior={1.45}
              thickness={0.5}
              attenuationDistance={2.5}
              attenuationColor={c.color}
              clearcoat={0.60}
              clearcoatRoughness={0.40}
              envMapIntensity={0.65}
              emissive={c.emissive}
              emissiveIntensity={0.45}
              transparent
              opacity={0.90}
            />
          </RoundedBox>

          {/* Label engraved on the top face */}
          <Text
            position={[0, TILE_H / 2 + 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            font={SILICON_FONT_URL}
            fontSize={0.70}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.08}
            outlineWidth={0.06}
            outlineColor="#03061a"
            material-toneMapped={false}
          >
            {c.label}
          </Text>
        </group>
      ))}
    </group>
  )
}
