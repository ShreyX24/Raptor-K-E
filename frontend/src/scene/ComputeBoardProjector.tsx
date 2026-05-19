/**
 * ComputeBoardProjector — perpendicular L1 board for the Compute Tile.
 *
 * Activates when computeContextInfo resolves to the Compute spec. Lays out
 * Compute's 25 children (8 P-cores + 4 E-clusters + 12 L3 slices + Ring
 * Agent) onto a 22 × 11.5 board at world (0, 5.75, 0), perpendicular to
 * the camera (X-Y plane at Z = 0) — same coordinate convention as the
 * Lion Cove L2 board so the choreographer's context-mode framing reuses.
 *
 * Each cell has THREE states (user spec 2026-05-19, combining asset 02 /
 * asset 03 / asset 01 from /test):
 *
 *   1. RESTING   — flat tile, per-type tint, fully diffuse (no reflection).
 *   2. HOVER     — same tile colour, but LIFTED toward camera + a cyan
 *                  square border ring (asset 03 frame ring style).
 *   3. HIGHLIGHT — when the cell is in focusPath[1] (clicked), bumps
 *                  emissive + edges + lift (asset 01 "open glow" feel).
 *
 * All cells are CLICKABLE → pushFocus(spec.id) appends to focusPath.
 * P-cores have enterContext=true so the innermost-wins dispatch swaps
 * the projector to the Lion Cove L2 board.
 *
 * Per-type colours (user-locked):
 *   P-core    → deep blue   #1e40af
 *   E-cluster → emerald     #047857
 *   L3 slice  → deep purple #6b21a8
 *   Ring      → orange      #ea580c
 *
 * Per [[feedback-no-reflection]]: every material is metalness 0, roughness 1,
 * envMapIntensity 0, clearcoat 0. Highlights use emissive only.
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Edges, Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'

import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'
import { chipSpec, type BlockSpec } from '@/data/chip-spec'
import { findBlockSpec } from '@/util/findBlock'
import { SILICON_FONT_URL } from '@/hud/fonts'

// ─── Board geometry — matches ContextProjector / choreographer ─────────
const BOARD_W = 22
const BOARD_H = 11.5
const BOARD_CENTER_Y = 5.75
const BOARD_PAD = 0.3

// Compute spec footprint = 7 × 5 in chip-spec coords. Scale up to the board.
// Z is flipped because chip's -Z (die-shot north) → board +Y (poster top).
const SRC_W = 7
const SRC_D = 5
const SCALE_X = BOARD_W / SRC_W
const SCALE_Y = BOARD_H / SRC_D

// ─── Per-type colours (user spec 2026-05-19) ─────────────────────────
const TYPE_COLORS = {
  pcore:    { color: '#1e40af', emissive: '#1e3a8a' }, // deep blue
  ecluster: { color: '#047857', emissive: '#064e3b' }, // emerald
  l3:       { color: '#6b21a8', emissive: '#3b0764' }, // deep purple
  ring:     { color: '#ea580c', emissive: '#7c2d12' }, // orange
  fallback: { color: '#6b7280', emissive: '#2a2f3a' },
} as const

// State-dependent visual offsets
const HOVER_LIFT_Z       = 0.4   // toward camera (+Z)
const HIGHLIGHT_LIFT_Z   = 0.6   // a little more than hover
const HOVER_RING_PAD     = 0.20  // ring extends this much beyond cell
const HOVER_RING_THK     = 0.05  // rod thickness
const HOVER_RING_COLOR   = '#22d3ee'

// Emissive intensity targets per state. Tuned so Bloom (luminanceThreshold=0.6)
// catches highlighted/hovered cells but rests just shy of it — the rest state
// reads as "lit panel", not "neon sign".
const EMISSIVE_REST       = 0.85
const EMISSIVE_HOVER      = 1.35
const EMISSIVE_HIGHLIGHT  = 2.20

// Animation rate — same DAMP value Block.tsx uses for opacity so the feel
// matches the existing focus transitions.
const DAMP = 8

function typeFor(spec: BlockSpec): keyof typeof TYPE_COLORS {
  if (/^compute\.p\d/.test(spec.id)) return 'pcore'
  if (/^compute\.e\d/.test(spec.id)) return 'ecluster'
  if (spec.id.includes('l3-s')) return 'l3'
  if (spec.id.includes('ring')) return 'ring'
  return 'fallback'
}

/** Compact, board-friendly label. */
function shortLabel(spec: BlockSpec): string {
  const id = spec.id
  let m = id.match(/^compute\.p(\d+)/)
  if (m) return `P #${m[1]}`
  m = id.match(/^compute\.e(\d+)/)
  if (m) return `E-cluster #${m[1]}`
  m = id.match(/l3-s(\d+)/)
  if (m) return `L3 · ${m[1]}`
  if (id.includes('ring')) return 'Ring Agent + L3 Tags'
  return spec.label.split('·')[0].trim()
}

interface ComputeCellProps {
  spec: BlockSpec
}

function ComputeCell({ spec }: ComputeCellProps) {
  // SCALAR selectors only — derive the boolean inside the selector so this
  // cell re-renders ONLY when its own hover/highlight status actually flips.
  // Subscribing to the whole hoveredBlockId/focusPath would re-render every
  // cell on any hover change (perf cliff with 25 cells).
  // See https://r3f.docs.pmnd.rs/advanced/scaling-performance
  const isHovered     = useStore((s) => s.hoveredBlockId === spec.id)
  const isHighlighted = useStore((s) => s.focusPath[1] === spec.id)
  // Actions are stable references in Zustand, safe to subscribe directly.
  const hover     = useStore((s) => s.hover)
  const pushFocus = useStore((s) => s.pushFocus)

  // Hoisted refs so useFrame can damp toward state-derived targets without
  // creating per-frame allocations.
  const groupRef    = useRef<THREE.Group>(null!)
  const matRef      = useRef<THREE.MeshPhysicalMaterial>(null!)
  const ringMatRefs = useRef<THREE.MeshBasicMaterial[]>([])

  const localX = (spec.localX ?? 0) * SCALE_X
  const localY = -(spec.localZ ?? 0) * SCALE_Y
  const w = spec.width * SCALE_X * 0.92
  const h = spec.depth * SCALE_Y * 0.90

  const t = typeFor(spec)
  const { color, emissive } = TYPE_COLORS[t]

  // Damp position.z + emissive + ring opacity toward state-derived targets.
  // No setState in useFrame; ref mutation only.
  useFrame((state, dt) => {
    const g = groupRef.current
    const m = matRef.current
    if (!g || !m) return

    const targetZ        = isHighlighted ? HIGHLIGHT_LIFT_Z : isHovered ? HOVER_LIFT_Z : 0
    const targetEmissive = isHighlighted ? EMISSIVE_HIGHLIGHT : isHovered ? EMISSIVE_HOVER : EMISSIVE_REST
    const targetRing     = isHovered && !isHighlighted ? 1 : 0

    g.position.z          = THREE.MathUtils.damp(g.position.z, targetZ, DAMP, dt)
    m.emissiveIntensity   = THREE.MathUtils.damp(m.emissiveIntensity, targetEmissive, DAMP, dt)
    for (const rm of ringMatRefs.current) {
      if (rm) rm.opacity = THREE.MathUtils.damp(rm.opacity, targetRing, DAMP, dt)
    }

    if (
      Math.abs(g.position.z - targetZ) > 0.002 ||
      Math.abs(m.emissiveIntensity - targetEmissive) > 0.01 ||
      (ringMatRefs.current[0] &&
        Math.abs(ringMatRefs.current[0].opacity - targetRing) > 0.01)
    ) {
      state.invalidate()
    }
  })

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hover(spec.id)
    document.body.style.cursor = 'pointer'
  }
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isHovered) hover(null)
    document.body.style.cursor = 'default'
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    pushFocus(spec.id)
  }

  const labelSize = Math.max(0.22, Math.min(w, h) * 0.22)
  const labelText = shortLabel(spec)

  // Cyan ring rod positions / sizes — pre-computed so layout doesn't recompute
  const ringW = w + HOVER_RING_PAD * 2
  const ringH = h + HOVER_RING_PAD * 2
  const halfRW = ringW / 2
  const halfRH = ringH / 2
  const rt = HOVER_RING_THK
  const ringRods: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [0, +halfRH, 0],     s: [ringW + rt, rt, rt] },
    { p: [0, -halfRH, 0],     s: [ringW + rt, rt, rt] },
    { p: [-halfRW, 0, 0],     s: [rt, ringH + rt, rt] },
    { p: [+halfRW, 0, 0],     s: [rt, ringH + rt, rt] },
  ]

  return (
    <group ref={groupRef} position={[localX, localY, 0]}>
      <mesh
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, h, 0.12]} />
        <meshPhysicalMaterial
          ref={matRef}
          color={color}
          emissive={emissive}
          emissiveIntensity={EMISSIVE_REST}
          metalness={0}
          roughness={1}
          clearcoat={0}
          envMapIntensity={0}
          transparent
          opacity={0.94}
        />
        <Edges
          color="#22d3ee"
          threshold={15}
          lineWidth={isHighlighted ? 1.7 : isHovered ? 1.3 : 0.9}
          transparent
          opacity={isHighlighted ? 0.85 : isHovered ? 0.6 : 0.4}
        />
      </mesh>

      {/* Cyan ring — always mounted, opacity damped by useFrame so the
          appearance / disappearance feels smooth (no popping in / out). */}
      <group position={[0, 0, 0.08]}>
        {ringRods.map((r, i) => (
          <mesh key={i} position={r.p}>
            <boxGeometry args={r.s} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) ringMatRefs.current[i] = m
              }}
              color={HOVER_RING_COLOR}
              toneMapped={false}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <Text
        position={[0, 0, 0.08]}
        font={SILICON_FONT_URL}
        fontSize={labelSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={w * 0.92}
        textAlign="center"
        letterSpacing={0.05}
        outlineWidth={0.04}
        outlineColor="#000814"
        material-toneMapped={false}
      >
        {labelText}
      </Text>
    </group>
  )
}

export function ComputeBoardProjector() {
  const focusPath = useStore((s) => s.focusPath)
  const ctx = computeContextInfo(focusPath)

  const computeSpec = useMemo(() => findBlockSpec(chipSpec, ['compute']), [])

  if (!ctx.active || !ctx.block || ctx.block.id !== 'compute') return null
  if (!computeSpec?.children?.length) return null

  const boardW = BOARD_W + BOARD_PAD * 2
  const boardH = BOARD_H + BOARD_PAD * 2

  return (
    <group>
      {/* Board background plate — fully diffuse per no-reflection rule */}
      <group position={[0, BOARD_CENTER_Y, -0.06]}>
        <mesh receiveShadow>
          <boxGeometry args={[boardW, boardH, 0.08]} />
          <meshPhysicalMaterial
            color="#0a1224"
            metalness={0}
            roughness={1}
            clearcoat={0}
            envMapIntensity={0}
            transparent
            opacity={0.96}
          />
          <Edges color="#22d3ee" threshold={1} lineWidth={2.0} transparent opacity={0.70} />
        </mesh>
      </group>

      {/* Cells laid out on the X-Y face */}
      <group position={[0, BOARD_CENTER_Y, 0]}>
        {computeSpec.children.map((child) => (
          <ComputeCell key={child.id} spec={child} />
        ))}
      </group>

      {/* Section title above the board */}
      <Text
        position={[0, BOARD_CENTER_Y + BOARD_H / 2 + 0.6, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color="#cfeaff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.10}
        outlineWidth={0.04}
        outlineColor="#000000"
        material-toneMapped={false}
      >
        Compute Tile · 8 P-cores · 4 E-clusters · 36 MB L3
      </Text>
    </group>
  )
}
