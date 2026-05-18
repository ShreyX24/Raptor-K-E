/**
 * BaseTile — the static substrate the 4 chiplets rest on.
 *
 * Per Intel Arrow Lake architecture diagram, "Base Tile" is the outer container
 * that holds CPU + IOE + SoC + GPU tiles in a 2D footprint. Visually it matches
 * the hero render: a flat dark plate with cyan light leaking from underneath.
 *
 * - Dark anodized body with subtle inner emissive
 * - Cyan emissive <Edges> outline at the perimeter (picked up by selective Bloom)
 * - Low pointLight underneath for the rim glow
 * - Receives shadows from chiplets above (sells the "floating" effect)
 *
 * Static — never lifts, never animates. Only the chiplets on top move.
 */
import * as THREE from 'three'
import { Edges } from '@react-three/drei'

interface BaseTileProps {
  width: number
  depth: number
  height?: number
}

export function BaseTile({ width, depth, height = 0.3 }: BaseTileProps) {
  return (
    <group position={[0, 0, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          color="#070a14"
          metalness={0.25}
          roughness={0.85}
          clearcoat={0.15}
          clearcoatRoughness={0.85}
          emissive="#040d18"
          emissiveIntensity={0.1}
          envMapIntensity={0.4}
        />
        <Edges color="#00b2ff" threshold={15} lineWidth={1.5} />
      </mesh>

      {/* Rim underglow — cyan light leaking from beneath the substrate.
          Lower intensity + sharper decay keeps the base looking dark with
          only a perimeter rim of cyan (matches Intel hero render). */}
      <pointLight
        position={[0, -height * 3, 0]}
        intensity={2.5}
        color="#00b2ff"
        distance={Math.max(width, depth) * 1.2}
        decay={2.4}
      />
    </group>
  )
}
