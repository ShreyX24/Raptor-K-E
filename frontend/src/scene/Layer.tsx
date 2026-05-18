/**
 * Layer — renders one L0 chiplet plate floating on top of the BaseTile.
 *
 * Phase 3: chiplet now reacts to focusPath:
 *   - focusPath = []                       → ground state, hover-lifts
 *   - focusPath[0] === tileId, len=1       → drilled into me, become wireframe ghost
 *   - focusPath[0] === tileId, len>1       → ancestor (same as above, ghost)
 *   - focusPath[0] !== tileId              → sibling, fade to 0.08
 *
 * Click pushes the tile id onto focusPath (drill in). Block.tsx then renders
 * the L1+ subtree above this chiplet.
 *
 * Anti-patterns avoided per skill SKILL.md:
 *   - No setState inside useFrame (ref-mutation only)
 *   - No new THREE.* allocations inside useFrame
 *   - THREE.MathUtils.damp is frame-rate independent
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'

import { useStore } from '@/state/store'
import { registerMesh, unregisterMesh } from './meshRegistry'

interface LayerProps {
  tileId: string
  position: [number, number, number]
  width: number
  depth: number
  height: number
  label?: string
}

const LIFT_AMOUNT = 2.0
const EMISSIVE_REST = 0.4
const EMISSIVE_HOVER = 1.2
const LIGHT_REST = 5
const LIGHT_HOVER = 9
const SIBLING_OPACITY = 0.08
const GHOST_OPACITY = 0.15
const FULL_OPACITY = 1.0
const DAMP = 6

export function Layer({ tileId, position, width, depth, height }: LayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const [hovered, setHovered] = useState(false)

  // Register this L0 tile's mesh with the choreographer's lookup table.
  useEffect(() => {
    if (meshRef.current) registerMesh(tileId, meshRef.current)
    return () => unregisterMesh(tileId)
  }, [tileId])

  const focusPath = useStore((s) => s.focusPath)
  const pushFocus = useStore((s) => s.pushFocus)
  const bootState = useStore((s) => s.bootState)

  const restY = position[1]
  const liftedY = restY + LIFT_AMOUNT

  // ---- focusPath state ----
  const isGroundState = focusPath.length === 0
  const isFocusedTile = focusPath[0] === tileId
  const isAncestor = isFocusedTile && focusPath.length >= 1 // I'm drilled into (focused or ancestor)
  const isSibling = focusPath.length > 0 && !isFocusedTile

  useFrame((state, dt) => {
    const g = groupRef.current
    const m = matRef.current
    const l = lightRef.current
    if (!g || !m || !l) return

    // Y target: only hover-lift in ground state
    const targetY = isGroundState && hovered ? liftedY : restY

    // Opacity target: full in ground state, 0.15 if drilled into, 0.08 if sibling
    let targetOpacity: number
    if (isAncestor) targetOpacity = GHOST_OPACITY
    else if (isSibling) targetOpacity = SIBLING_OPACITY
    else targetOpacity = FULL_OPACITY

    // Phase 4 boot gate: lidded → invisible; delidding/delidded → use focusPath target
    if (bootState === 'lidded') targetOpacity = 0

    // Emissive target: hover bump only in ground state
    const targetEmissive =
      isGroundState && hovered ? EMISSIVE_HOVER : EMISSIVE_REST

    // Underglow target: brighter on hover in ground state; dim when drilled or sibling
    let targetLight: number
    if (isAncestor || isSibling) targetLight = 0
    else if (isGroundState && hovered) targetLight = LIGHT_HOVER
    else targetLight = LIGHT_REST

    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, DAMP, dt)
    m.opacity = THREE.MathUtils.damp(m.opacity, targetOpacity, DAMP, dt)
    m.emissiveIntensity = THREE.MathUtils.damp(
      m.emissiveIntensity,
      targetEmissive,
      DAMP,
      dt,
    )
    l.intensity = THREE.MathUtils.damp(l.intensity, targetLight, DAMP, dt)

    // Demand-mode: keep the loop alive while still in motion. Settles when all
    // four properties are within their respective epsilons of their targets.
    if (
      Math.abs(g.position.y - targetY) > 0.001 ||
      Math.abs(m.opacity - targetOpacity) > 0.002 ||
      Math.abs(m.emissiveIntensity - targetEmissive) > 0.01 ||
      Math.abs(l.intensity - targetLight) > 0.02
    ) {
      state.invalidate()
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isGroundState) return // already drilled in; ignore further clicks at L0
    e.stopPropagation()
    pushFocus(tileId)
  }

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isGroundState) return
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#1c2b4a"
          metalness={0.15}
          roughness={0.7}
          clearcoat={0.05}
          clearcoatRoughness={0.85}
          emissive="#073f60"
          emissiveIntensity={EMISSIVE_REST}
          envMapIntensity={0.3}
          transparent
          opacity={FULL_OPACITY}
        />
        <Edges color="#00d4ff" threshold={15} lineWidth={2} />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, -height * 0.8, 0]}
        intensity={LIGHT_REST}
        color="#00b2ff"
        distance={Math.max(width, depth) * 1.5}
        decay={1.6}
      />
    </group>
  )
}
