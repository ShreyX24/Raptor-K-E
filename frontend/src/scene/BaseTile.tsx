/**
 * BaseTile — the static substrate the 4 chiplets rest on.
 *
 * Per Intel Arrow Lake architecture diagram, "Base Tile" is the outer container
 * that holds CPU + IOE + SoC + GPU tiles in a 2D footprint. Visually it matches
 * the hero render: a flat dark plate with cyan light leaking from underneath.
 *
 * Static — never lifts, never animates. Hides entirely in context mode so the
 * inner board (e.g. Lion Cove pipeline) takes the whole viewport.
 */
import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'

import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'

interface BaseTileProps {
  width: number
  depth: number
  height?: number
}

const DAMP = 6

export function BaseTile({ width, depth, height = 0.3 }: BaseTileProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const focusPath = useStore((s) => s.focusPath)
  const bootState = useStore((s) => s.bootState)
  const contextActive = computeContextInfo(focusPath).active

  useFrame((state, dt) => {
    const m = matRef.current
    const l = lightRef.current
    const g = groupRef.current
    if (!m || !l || !g) return

    // Hidden during context mode (P-core deep view); also dimmed during lid.
    const targetOpacity = contextActive ? 0 : 1
    const targetLight = contextActive ? 0 : 2.5

    m.opacity = THREE.MathUtils.damp(m.opacity, targetOpacity, DAMP, dt)
    l.intensity = THREE.MathUtils.damp(l.intensity, targetLight, DAMP, dt)
    g.visible = m.opacity > 0.01

    if (
      Math.abs(m.opacity - targetOpacity) > 0.002 ||
      Math.abs(l.intensity - targetLight) > 0.02
    ) {
      state.invalidate()
    }
    void bootState // referenced for future tuning
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#070a14"
          metalness={0.25}
          roughness={0.85}
          clearcoat={0.15}
          clearcoatRoughness={0.85}
          emissive="#040d18"
          emissiveIntensity={0.1}
          envMapIntensity={0.4}
          transparent
          opacity={1}
        />
        <Edges color="#00b2ff" threshold={15} lineWidth={1.5} />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, -height * 3, 0]}
        intensity={2.5}
        color="#00b2ff"
        distance={Math.max(width, depth) * 1.2}
        decay={2.4}
      />
    </group>
  )
}
