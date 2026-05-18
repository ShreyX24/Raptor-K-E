/**
 * FillerTile — non-interactive "empty strengthening tile" that sits in the
 * top-left corner of the ARL package.
 *
 * Real ARL 200S / 200S+ packages include this structural die for mechanical
 * + thermal integrity; it has no logic and no PMU. Renders as a static plate
 * (no Layer/Block — no click, no hover, no drill). Sits at the same Y as the
 * functional chiplets but is unmistakably dim and inert.
 *
 * Reference: F:\Raptor-K-E\reference images\Screenshot 2026-05-18 203104.png
 * (the user-supplied ARL family floorplan)
 */
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

import { useStore } from '@/state/store'

interface FillerTileProps {
  position: [number, number, number]
  width: number
  depth: number
  height: number
}

const DAMP = 6
const REST_OPACITY = 1.0

export function FillerTile({ position, width, depth, height }: FillerTileProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const bootState = useStore((s) => s.bootState)

  useFrame((state, dt) => {
    const g = groupRef.current
    const m = matRef.current
    if (!g || !m) return

    // Hidden under the IHS, revealed once delidded — same gate as Layer
    const targetOpacity = bootState === 'lidded' ? 0 : REST_OPACITY
    m.opacity = THREE.MathUtils.damp(m.opacity, targetOpacity, DAMP, dt)
    g.visible = m.opacity > 0.01

    if (Math.abs(m.opacity - targetOpacity) > 0.002) state.invalidate()
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#1a1d24"
          metalness={0.15}
          roughness={0.85}
          clearcoat={0.05}
          clearcoatRoughness={0.9}
          emissive="#000000"
          emissiveIntensity={0}
          envMapIntensity={0.25}
          transparent
          opacity={REST_OPACITY}
        />
        {/* Dim cyan rim so it's still readable as "a tile" but clearly inert */}
        <Edges color="#1a4a6a" threshold={15} lineWidth={1} />
      </mesh>
    </group>
  )
}
