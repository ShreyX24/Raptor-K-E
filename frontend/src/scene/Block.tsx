/**
 * Block — recursive renderer for one BlockSpec at drill depth ≥ 1.
 *
 * L0 chiplets are still rendered by Layer.tsx (cyan glass + hover lift). This
 * component handles L1+ (the layers that rise above the base when the user
 * drills in). The L1 children of each L0 tile are mounted at startup; they
 * are kept invisible until the user drills into that tile. No mount/unmount
 * on focus change (skill anti-pattern).
 *
 * Visibility/opacity is driven by focusPath:
 *   - in focus chain, last entry   → focused: full opacity, click children
 *   - in focus chain, not last     → ancestor: wireframe ghost @ 0.15
 *   - focusPath reached my depth,
 *     but my id isn't there         → sibling: faded @ 0.08
 *   - focusPath hasn't reached me   → hidden (visible=false)
 *
 * Anti-patterns avoided per SKILL.md:
 *   - No setState inside useFrame (ref-mutation only)
 *   - No mount/unmount on focus change (visible flag + opacity damp)
 *   - No new THREE.* allocations inside useFrame
 *   - Damp via THREE.MathUtils.damp (frame-rate independent)
 */
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'

import type { BlockSpec } from '@/data/chip-spec'
import { useStore } from '@/state/store'
import { packChildren } from '@/util/packChildren'
import { registerMesh, unregisterMesh } from './meshRegistry'
import { severityColors, severityIntensity, PULSE_RATE } from '@/util/severity'
import { BlockMetrics } from '@/hud/BlockMetrics'

export const DRILL_GAP = 2.0
export const CHILD_HEIGHT = 0.32

const SIBLING_OPACITY = 0.08
const GHOST_OPACITY = 0.15
const FULL_OPACITY = 1.0
const EMISSIVE_REST = 0.3
const EMISSIVE_HOVER = 1.2
const DAMP = 6

// Reusable Three.js objects — hoisted to avoid per-frame allocations.
const _restEmissiveColor = new THREE.Color('#0a3a55')
const _targetEmissive = new THREE.Color()

interface BlockProps {
  spec: BlockSpec
  position: [number, number, number]
  width: number
  depth: number
  height?: number
  drillDepth: number // 1 for L1, 2 for L2, etc.
  parentTileId: string // the L0 tile id this block lives under (for sibling-fade gating)
}

export function Block({
  spec,
  position,
  width,
  depth,
  height = CHILD_HEIGHT,
  drillDepth,
  parentTileId,
}: BlockProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)

  // Register this block's mesh with the choreographer's lookup table.
  useEffect(() => {
    if (meshRef.current) registerMesh(spec.id, meshRef.current)
    return () => unregisterMesh(spec.id)
  }, [spec.id])

  const focusPath = useStore((s) => s.focusPath)
  const hoveredId = useStore((s) => s.hoveredBlockId)
  const pushFocus = useStore((s) => s.pushFocus)
  const hover = useStore((s) => s.hover)
  const bootState = useStore((s) => s.bootState)
  // Severity for this block (Phase 4 binding). Undefined when no finding present.
  const severity = useStore((s) => s.findings[spec.id]?.severity)

  // ---- state vs focusPath ----
  // L0 tile id sits at focusPath[0]; my drillDepth is 1 for L1 children of an L0 tile.
  // So my expected index in focusPath is `drillDepth` (because focusPath[0] = L0 tile id).
  const myIndex = drillDepth
  const inFocusChain = focusPath[myIndex] === spec.id
  const isFocused = inFocusChain && focusPath.length === myIndex + 1
  const isAncestor = inFocusChain && focusPath.length > myIndex + 1
  // I should be visible when my parent tile has been focused: focusPath[0] === parentTileId
  // AND focusPath has advanced at least to my level: focusPath.length >= drillDepth
  const parentTileFocused = focusPath[0] === parentTileId
  const reachedMyLevel = focusPath.length >= drillDepth
  const isVisible = parentTileFocused && reachedMyLevel
  const isSibling = isVisible && focusPath.length > myIndex && !inFocusChain
  const hoveredHere = hoveredId === spec.id

  // Children get packed inside my footprint, raised by DRILL_GAP
  const packedChildren = useMemo(() => {
    if (!spec.children?.length) return []
    return packChildren(spec.children, position[0], position[2], width, depth)
  }, [spec.children, position[0], position[2], width, depth])

  const childY = position[1] + height / 2 + DRILL_GAP

  // ---- per-frame: damp opacity + emissive toward target ----
  useFrame((state, dt) => {
    const g = groupRef.current
    const m = matRef.current
    if (!g || !m) return

    // Target opacity: hidden=0, sibling=0.08, ancestor=0.15, focused=1.0
    let targetOpacity: number
    if (!isVisible) targetOpacity = 0
    else if (isSibling) targetOpacity = SIBLING_OPACITY
    else if (isAncestor) targetOpacity = GHOST_OPACITY
    else targetOpacity = FULL_OPACITY

    // Phase 4 boot gate: lidded → invisible; delidding/delidded → use focusPath target
    if (bootState === 'lidded') targetOpacity = 0

    const canHover = isVisible && !isSibling && !isAncestor && hoveredHere

    // Severity drives emissive color + intensity floor for visible (non-sibling/ghost) blocks.
    // CRITICAL pulses around its base intensity at PULSE_RATE rad/s.
    // Hover bump stacks on top.
    let targetEmissiveIntensity: number
    if (severity && isVisible && !isSibling && !isAncestor) {
      _targetEmissive.copy(severityColors[severity])
      let base = severityIntensity[severity]
      if (severity === 'CRITICAL') {
        // Pulse 60% → 120% of base intensity (skill: only CRITICAL pulses)
        const pulse = (Math.sin(state.clock.elapsedTime * PULSE_RATE) + 1) * 0.5
        base = base * (0.6 + pulse * 0.6)
      }
      targetEmissiveIntensity = base + (canHover ? 0.8 : 0)
    } else {
      _targetEmissive.copy(_restEmissiveColor)
      targetEmissiveIntensity = canHover ? EMISSIVE_HOVER : EMISSIVE_REST
    }

    m.opacity = THREE.MathUtils.damp(m.opacity, targetOpacity, DAMP, dt)
    m.emissiveIntensity = THREE.MathUtils.damp(
      m.emissiveIntensity,
      targetEmissiveIntensity,
      DAMP,
      dt,
    )
    // Damp the emissive color RGB channels toward target
    m.emissive.r = THREE.MathUtils.damp(m.emissive.r, _targetEmissive.r, DAMP, dt)
    m.emissive.g = THREE.MathUtils.damp(m.emissive.g, _targetEmissive.g, DAMP, dt)
    m.emissive.b = THREE.MathUtils.damp(m.emissive.b, _targetEmissive.b, DAMP, dt)

    // Hide the group entirely when essentially invisible (saves draw calls)
    g.visible = m.opacity > 0.01

    // Demand-mode: keep ticking while animating, OR forever if CRITICAL (pulses).
    if (
      severity === 'CRITICAL' ||
      Math.abs(m.opacity - targetOpacity) > 0.002 ||
      Math.abs(m.emissiveIntensity - targetEmissiveIntensity) > 0.01 ||
      Math.abs(m.emissive.r - _targetEmissive.r) > 0.005 ||
      Math.abs(m.emissive.g - _targetEmissive.g) > 0.005 ||
      Math.abs(m.emissive.b - _targetEmissive.b) > 0.005
    ) {
      state.invalidate()
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isVisible || isSibling || isAncestor) return
    e.stopPropagation()
    pushFocus(spec.id)
  }

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isVisible || isSibling || isAncestor) return
    e.stopPropagation()
    hover(spec.id)
    document.body.style.cursor = 'pointer'
  }

  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    if (hoveredHere) hover(null)
    document.body.style.cursor = 'default'
    e.stopPropagation()
  }

  return (
    <>
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
            color="#1a1d24"
            metalness={0.85}
            roughness={0.42}
            clearcoat={0.4}
            clearcoatRoughness={0.6}
            emissive="#0a3a55"
            emissiveIntensity={EMISSIVE_REST}
            envMapIntensity={1.1}
            transparent
            opacity={FULL_OPACITY}
          />
          <Edges color="#00b2ff" threshold={15} />
        </mesh>

        {/* PMU counter overlay — only mounted when block is visible at the current
            drill depth and has metrics. Anchored to the block's top face. */}
        {isVisible && !isSibling && !isAncestor && (
          <BlockMetrics blockId={spec.id} topY={height / 2} />
        )}
      </group>

      {/* Recursively render children — they decide their own visibility */}
      {packedChildren.map(({ child, x, z, w, d }) => (
        <Block
          key={child.id}
          spec={child}
          position={[x, childY, z]}
          width={w}
          depth={d}
          drillDepth={drillDepth + 1}
          parentTileId={parentTileId}
        />
      ))}
    </>
  )
}
