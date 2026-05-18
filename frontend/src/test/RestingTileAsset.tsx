/**
 * RestingTileAsset — asset 02 in /test.
 *
 * Default / "resting" tile look. Matches Presentation1_page-0002.jpg:
 *   - THIN glass slides (TILE_H = 0.25, not chunky cuboids)
 *   - Frosted glass body (MeshPhysicalMaterial w/ transmission + clearcoat)
 *   - Per-tile tint
 *   - Tiles are translucent enough that the SUBSTRATE GRID beneath shows
 *     through. That "row/column lattice" inside each tile in the reference
 *     is NOT an internal texture — it's the chip board below, visible
 *     through the glass.
 *   - Subtle thin top-edge rim (cool-blue, not the bright cyan hover ring)
 *   - White text label on the top face
 *
 * Layout mirrors the Architecture Day reference for clarity:
 *   Front End  / Out of Order Engine  / Scalar+Vector Engines  / Memory
 */
import { Edges, RoundedBox, Text } from '@react-three/drei'

import { SILICON_FONT_URL } from '@/hud/fonts'
import { useSubstrateTexture } from './substrateTexture'

interface RestingTileDef {
  id: string
  label: string
  x: number
  z: number
  w: number
  d: number
  color: string
  emissive: string
}

// Thin glass slide — was 0.85, dropped to match the reference's plate-like look
const TILE_H = 0.25

const TILES: RestingTileDef[] = [
  // Row 1 — Front End (teal, saturated)
  { id: 'fe',  label: 'Front End',           x:  0,    z: -5.0, w: 14, d: 3.0, color: '#0ea5b7', emissive: '#0a5a6a' },
  // Row 2 — OoO Engine (brushed cool-steel)
  { id: 'ooo', label: 'Out of Order Engine', x:  0,    z: -1.5, w: 14, d: 2.5, color: '#788397', emissive: '#2d3550' },
  // Row 3 — Scalar (deep blue, wide) + Vector (royal blue, narrow)
  { id: 'sca', label: 'Scalar Engine',       x: -2.55, z:  2.0, w:  9,   d: 3.5, color: '#1d4ed8', emissive: '#0a2782' },
  { id: 'vec', label: 'Vector Engine',       x:  5.30, z:  2.0, w:  3.5, d: 3.5, color: '#3b82f6', emissive: '#1e40af' },
  // Row 4 — Memory Subsystem (navy / dark indigo)
  { id: 'mem', label: 'Memory Subsystem',    x:  0,    z:  5.5, w: 14, d: 3.0, color: '#1e1b4b', emissive: '#0e0c2e' },
]

// Substrate (chip board) — sits a hair below all tiles
const SUBSTRATE_W   = 17.0
const SUBSTRATE_D   = 18.0
const SUBSTRATE_THK = 0.35
const SUBSTRATE_Y   = -(TILE_H / 2) - (SUBSTRATE_THK / 2) - 0.01

function RestingTile({ tile }: { tile: RestingTileDef }) {
  const labelSize = tile.w < 5 ? 0.45 : 0.65

  return (
    <group position={[tile.x, 0, tile.z]}>
      {/* RoundedBox softens E2/E4/E6/E8 verticals AND the top/bottom corners
          where they meet — keeps the silhouette clean instead of pointy.
          radius is small (0.04) per user direction: "just a little". */}
      <RoundedBox args={[tile.w, TILE_H, tile.d]} radius={0.04} smoothness={4} creaseAngle={0.4}>
        {/* Thin frosted glass — transmission lets the substrate grid
            beneath read through, clearcoat gives a wet/glassy top */}
        <meshPhysicalMaterial
          color={tile.color}
          roughness={0.45}
          metalness={0.05}
          transmission={0.55}
          ior={1.45}
          thickness={0.4}
          attenuationDistance={2.5}
          attenuationColor={tile.color}
          clearcoat={0.65}
          clearcoatRoughness={0.35}
          envMapIntensity={0.65}
          emissive={tile.emissive}
          emissiveIntensity={0.35}
          transparent
          opacity={0.85}
        />
        {/* Faint cool-blue top rim — NOT the bright cyan hover ring */}
        <Edges color="#9fc8e8" lineWidth={0.9} transparent opacity={0.30} />
      </RoundedBox>

      {/* White label flat on top face */}
      <Text
        position={[0, TILE_H / 2 + 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        font={SILICON_FONT_URL}
        fontSize={labelSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        outlineWidth={0.05}
        outlineColor="#03061a"
        material-toneMapped={false}
      >
        {tile.label}
      </Text>
    </group>
  )
}

export function RestingTileAsset() {
  const substrateMap = useSubstrateTexture()

  return (
    <group>
      {/* Section labels */}
      <Text
        position={[0, 4.5, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.75}
        color="#cfd6ff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        RESTING / DEFAULT
      </Text>
      <Text
        position={[0, 3.55, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color="#a5b3e5"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        outlineWidth={0.035}
        outlineColor="#001020"
      >
        asset 02 · frosted glass, per-tile tint
      </Text>

      {/* Substrate (chip board) — top face textured with the row/column
          grid that reads through the translucent tiles above. Lightly
          rounded corners too, so it matches the tile silhouette. */}
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

      {/* The 5 thin-glass resting tiles */}
      {TILES.map((t) => (
        <RestingTile key={t.id} tile={t} />
      ))}
    </group>
  )
}
