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
 *   - Brushed dark nickel: color #2a2d33, moderate metalness, high roughness
 *   - Anisotropic specular highlight running north-south (the brush direction)
 *   - Sits at Y ≈ 1.65 (lid center) just above the chiplet rest level (0.9)
 *
 * BUG-003 fix: the delid animation is time-driven (easeOutCubic over
 * DELID_DURATION_MS) rather than damp-to-threshold, so the cinematic ~1 s beat
 * is preserved. The previous damp-only approach completed in ~226 ms because
 * `THREE.MathUtils.damp(1, 0, 5, dt)` crosses the 0.02 threshold within ~10
 * frames.
 *
 * Anti-patterns avoided per skill SKILL.md:
 *   - No setState inside useFrame (only ref-mutation)
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
/** Total delid duration in ms. Spec is ~1.2 s for the cinematic beat. */
export const DELID_DURATION_MS = 1100
/** Damp rate for the *lidded* settle animation (entering the rest pose). */
const LIDDED_DAMP = 5

// easeOutCubic — same curve the Phase 4 spec implied (camera-controls also uses cubic)
function easeOutCubic(t: number): number {
  const inv = 1 - t
  return 1 - inv * inv * inv
}

export function IHS({ width, depth, height = 0.45, y = IHS_Y_REST }: IHSProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const delidStartTimeRef = useRef<number | null>(null)

  const bootState = useStore((s) => s.bootState)
  const finishDelid = useStore((s) => s.finishDelid)

  // Capture the wall-clock start when bootState flips to 'delidding'
  useEffect(() => {
    if (bootState === 'delidding') {
      delidStartTimeRef.current = performance.now()
    } else if (bootState === 'lidded') {
      delidStartTimeRef.current = null
    }
  }, [bootState])

  useFrame((state, dt) => {
    const g = groupRef.current
    const m = matRef.current
    if (!g || !m) return

    if (bootState === 'lidded') {
      // Settle to rest pose — keep the damp here because there's no hard deadline
      g.position.y = THREE.MathUtils.damp(g.position.y, y, LIDDED_DAMP, dt)
      m.opacity = THREE.MathUtils.damp(m.opacity, 1, LIDDED_DAMP, dt)
      if (Math.abs(g.position.y - y) > 0.001 || Math.abs(m.opacity - 1) > 0.002) {
        state.invalidate()
      }
    } else if (bootState === 'delidding') {
      // Time-driven easing so the cinematic ~1.1 s beat is preserved regardless
      // of frame rate. (BUG-003 fix: replaces damp-to-threshold which finished
      // in ~226 ms on a 60 Hz display.)
      const startedAt = delidStartTimeRef.current ?? performance.now()
      const elapsedMs = performance.now() - startedAt
      const t = Math.min(1, elapsedMs / DELID_DURATION_MS)
      const eased = easeOutCubic(t)

      g.position.y = y + (IHS_Y_LIFTED - y) * eased
      // Opacity fades faster than the lift (out by 80% of duration)
      m.opacity = Math.max(0, 1 - eased * 1.25)

      if (t >= 1) {
        finishDelid()
      } else {
        state.invalidate()
      }
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
          anisotropy={0.5}
          anisotropyRotation={Math.PI / 2}
          transparent
          opacity={1}
        />
        <Edges color="#00b2ff" threshold={15} lineWidth={1} />
      </mesh>

      {/* Engraved labels — children of the IHS group so they lift along with it */}
      <IHSText topY={height / 2} width={width} depth={depth} />
    </group>
  )
}
