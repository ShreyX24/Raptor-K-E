/**
 * IHS — Integrated Heat Spreader.
 *
 * Phase 4 Act 1: the physical metal lid that covers the dies on every retail
 * Intel CPU package. Page loads in `bootState === 'lidded'` showing this; once
 * backend data arrives, `bootState` flips to `'delidding'` and this mesh lifts
 * upward + fades out (Phase 4 Act 2).
 *
 * Visual reference: F:\Raptor-K-E\reference images\processor-s-l400.jpg
 *
 *   - Brushed dark nickel: color #3a3d42, high metalness, moderate roughness
 *   - Anisotropic specular highlight running north-south (the brush direction)
 *   - Slight bevel on the top face (chamfered edges)
 *   - Sits at Y ≈ 2.0 — just above the chiplet rest level (0.9 + 0.5/2 = 1.15)
 *     so a small visible gap shows the chiplets peeking out at the perimeter
 *     during the lift animation
 *
 * Anti-patterns avoided per skill SKILL.md:
 *   - No setState inside useFrame (only ref-mutation for opacity/position)
 *   - Hoisted constants; no new THREE.* allocations per frame
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'

import { useStore } from '@/state/store'
import { IHSText } from '@/hud/IHSText'

interface IHSProps {
  width: number
  depth: number
  /** thickness of the lid; lid TOP sits at y = baseY + height */
  height?: number
  /** Y of the lid's center */
  y?: number
}

// Animation constants — referenced by delidAnimation too
export const IHS_Y_REST = 1.65 // lid center when 'lidded' (covers chiplets at Y_REST=0.9)
export const IHS_Y_LIFTED = 6.0
export const DELID_DAMP = 5

export function IHS({ width, depth, height = 0.45, y = IHS_Y_REST }: IHSProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)

  const bootState = useStore((s) => s.bootState)
  const finishDelid = useStore((s) => s.finishDelid)

  // When delidding starts, lerp position up and opacity down; when fully faded,
  // flip state to 'delidded' (single side-effect, guarded so it fires once).
  useFrame((_, dt) => {
    const g = groupRef.current
    const m = matRef.current
    if (!g || !m) return

    if (bootState === 'lidded') {
      g.position.y = THREE.MathUtils.damp(g.position.y, y, DELID_DAMP, dt)
      m.opacity = THREE.MathUtils.damp(m.opacity, 1, DELID_DAMP, dt)
    } else if (bootState === 'delidding') {
      g.position.y = THREE.MathUtils.damp(g.position.y, IHS_Y_LIFTED, DELID_DAMP, dt)
      m.opacity = THREE.MathUtils.damp(m.opacity, 0, DELID_DAMP, dt)
      if (m.opacity < 0.02) finishDelid()
    } else {
      // delidded — keep invisible above so it doesn't block raycasts
      m.opacity = 0
      g.visible = false
    }
  })

  // Force-show the group every render in case it got hidden after a delid
  useEffect(() => {
    if (groupRef.current && bootState !== 'delidded') {
      groupRef.current.visible = true
    }
  }, [bootState])

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#2a2d33"
          metalness={0.4}
          roughness={0.72}
          clearcoat={0.08}
          clearcoatRoughness={0.8}
          envMapIntensity={0.4}
          // Anisotropic highlight runs north-south (along Z, the long axis) —
          // matches the brushed-metal grain visible on the real 285K IHS.
          anisotropy={0.5}
          anisotropyRotation={Math.PI / 2}
          transparent
          opacity={1}
        />
        {/* Subtle cyan rim at the lid edges — picks up selective Bloom */}
        <Edges color="#00b2ff" threshold={15} lineWidth={1} />
      </mesh>

      {/* Engraved labels — children of the IHS group so they lift along with it */}
      <IHSText topY={height / 2} width={width} depth={depth} />
    </group>
  )
}
