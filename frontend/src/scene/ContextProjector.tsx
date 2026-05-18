/**
 * ContextProjector — vertical Lion Cove board + wide-angled trapezium podium +
 * 4 corner projection lines.
 *
 * Visual model (per user mockup, reference Screenshot 2026-05-19 003454.png):
 *
 *      ┌────────────────────────────────┐   ← the BOARD (vertical wall facing
 *      │  Lion Cove pipeline cells       │     camera, like a bulletin board)
 *      │  ── all the die-shot tiles ──   │
 *      │  on a flat X-Y poster surface   │
 *      └────────────────────────────────┘
 *               \   |       |    /
 *                \  |       |   /            ← 4 projection LINES from board
 *                 \ |       |  /               corners diverge down to the
 *                  \|       | /                trapezium top corners
 *               ┌───┴───────┴───┐
 *               │   P Core #1    │            ← TRAPEZIUM tile, wide at bottom,
 *               └────────────────┘              narrow at top — the "projector"
 *
 * - The board is rendered in the world X-Y plane (Z ≈ 0, facing the camera).
 * - Each Lion Cove cell is a thin plate with anodized material + cyan edges.
 * - Each cell has its label engraved on the front face (camera-facing).
 * - The trapezium is a 3D prism with a wide rectangular base and a narrower
 *   top face. Sloped sides flare outward going down — matches the user's
 *   wide-angle drawing.
 * - 4 lines connect board's 4 corners (top-left, top-right, bottom-left,
 *   bottom-right) to the trapezium top face's 4 corners.
 *
 * Reference die layout: F:\Raptor-K-E\reference images\die p core.jpg
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Line, Edges, Text } from '@react-three/drei'

import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'
import type { BlockSpec } from '@/data/chip-spec'
import { SILICON_FONT_URL } from '@/hud/fonts'

// ─── Layout constants ─────────────────────────────────────────────────
// World coordinates for the context view (camera looks at this in +Z direction).
//
// Board face is in world X-Y plane at Z=0. Cells from chip-spec come in raw
// localX∈[-8,8] / localZ∈[-7,7] coordinates; we SCALE them to fit a wider
// (more 16:9-ish) board so the canvas fills the viewport. Aspect 22:10 ≈ 2.2.
const BOARD_W = 22                    // world width  (X) of the board face
const BOARD_H = 10                    // world height (Y) of the board face
const BOARD_CENTER_Y = 6              // board middle, world Y
const BOARD_FACE_Z = 0
const CELL_SCALE_X = BOARD_W / 16     // 1.375 (chip-spec X span is 16)
const CELL_SCALE_Y = BOARD_H / 14     // 0.714 (chip-spec Z span is 14)

// Trapezium podium (the P-core "projector" base) — below the board
const TRAP_TOP_Y    = 0.0   // trapezium TOP face Y (world)
const TRAP_BOT_Y    = -1.4  // trapezium BOTTOM face Y (world)
const TRAP_TOP_W    = 6.0   // narrower at top
const TRAP_TOP_D    = 1.2
const TRAP_BOT_W    = 10.0  // wider at bottom (wide-angled, per user drawing)
const TRAP_BOT_D    = 2.4

// Bezel inset for the cyan rim on the board frame
const BOARD_PAD = 0.3

// Engraved-text colors
const LABEL_COLOR = '#cfd6e2'
const LABEL_OUTLINE = '#000814'

// ─── Helpers ──────────────────────────────────────────────────────────

/** Build the trapezium frustum geometry once (same shape for all P-cores). */
function makeTrapezium(): THREE.BufferGeometry {
  const halfBW = TRAP_BOT_W / 2
  const halfBD = TRAP_BOT_D / 2
  const halfTW = TRAP_TOP_W / 2
  const halfTD = TRAP_TOP_D / 2
  const y0 = TRAP_BOT_Y
  const y1 = TRAP_TOP_Y

  // prettier-ignore
  const verts = new Float32Array([
    // bottom (y0) — wider
    -halfBW, y0, -halfBD, // 0  back-left
     halfBW, y0, -halfBD, // 1  back-right
     halfBW, y0,  halfBD, // 2  front-right
    -halfBW, y0,  halfBD, // 3  front-left
    // top (y1) — narrower
    -halfTW, y1, -halfTD, // 4  back-left
     halfTW, y1, -halfTD, // 5  back-right
     halfTW, y1,  halfTD, // 6  front-right
    -halfTW, y1,  halfTD, // 7  front-left
  ])
  // prettier-ignore
  const idx = new Uint16Array([
    0, 2, 1,   0, 3, 2,                 // bottom
    4, 5, 6,   4, 6, 7,                 // top
    0, 1, 5,   0, 5, 4,                 // back
    1, 2, 6,   1, 6, 5,                 // right
    2, 3, 7,   2, 7, 6,                 // front
    3, 0, 4,   3, 4, 7,                 // left
  ])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  g.computeVertexNormals()
  return g
}

// Lookup the Lion Cove board children for a specific parent id by walking chipSpec.
import { chipSpec } from '@/data/chip-spec'
import { findBlockSpec } from '@/util/findBlock'

function getContextChildren(focusPath: string[]): BlockSpec[] {
  const spec = findBlockSpec(chipSpec, focusPath)
  return spec?.children ?? []
}

// ─── Sub-components ───────────────────────────────────────────────────

interface BoardCellProps {
  spec: BlockSpec
}

function BoardCell({ spec }: BoardCellProps) {
  // chip-spec localX/Z are in raw [-8,8]×[-7,7] coords. Scale to fit the
  // 22×10 board face (X×Y). Width/depth scale the same way.
  const localX = (spec.localX ?? 0) * CELL_SCALE_X
  const localY = (spec.localZ ?? 0) * CELL_SCALE_Y
  const w = spec.width * CELL_SCALE_X
  const h = spec.depth * CELL_SCALE_Y
  const thickness = Math.max(0.08, spec.height ?? 0.15)

  // Auto-sized label
  const labelSize = Math.max(0.14, Math.min(w, h) * 0.18)
  const maxLabelW = w * 0.86

  return (
    <group position={[localX, localY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, thickness]} />
        <meshPhysicalMaterial
          color="#1a222d"
          metalness={0.4}
          roughness={0.55}
          clearcoat={0.4}
          clearcoatRoughness={0.4}
          emissive="#0a3a55"
          emissiveIntensity={0.32}
          envMapIntensity={0.8}
        />
        {/* Visible cyan border per user request */}
        <Edges color="#00b2ff" threshold={1} lineWidth={1.5} />
      </mesh>
      {/* Front-face engraved label */}
      <Text
        position={[0, 0, thickness / 2 + 0.005]}
        font={SILICON_FONT_URL}
        fontSize={labelSize}
        color={LABEL_COLOR}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.03}
        maxWidth={maxLabelW}
        textAlign="center"
        outlineWidth={labelSize * 0.05}
        outlineColor={LABEL_OUTLINE}
      >
        {spec.label}
      </Text>
    </group>
  )
}

// ─── Main component ───────────────────────────────────────────────────

export function ContextProjector() {
  const focusPath = useStore((s) => s.focusPath)
  const ctx = computeContextInfo(focusPath)

  // Build geometry once
  const trapGeom = useMemo(makeTrapezium, [])

  // Children of the focused context block (the Lion Cove cells)
  const children = useMemo(() => {
    if (!ctx.active || !ctx.path) return []
    return getContextChildren(ctx.path)
  }, [ctx.active, ctx.path])

  if (!ctx.active || !ctx.block) return null

  // Board outer dims (the background plate behind the cells, framed in cyan rim)
  const boardW = BOARD_W + BOARD_PAD * 2
  const boardH = BOARD_H + BOARD_PAD * 2

  // Board corner world positions (front face, at Z = 0)
  const halfBW = BOARD_W / 2
  const halfBH = BOARD_H / 2
  const boardCornersFront: [number, number, number][] = [
    [-halfBW, BOARD_CENTER_Y - halfBH, BOARD_FACE_Z], // bottom-left
    [ halfBW, BOARD_CENTER_Y - halfBH, BOARD_FACE_Z], // bottom-right
    [ halfBW, BOARD_CENTER_Y + halfBH, BOARD_FACE_Z], // top-right
    [-halfBW, BOARD_CENTER_Y + halfBH, BOARD_FACE_Z], // top-left
  ]

  // Trapezium top corners (matches the 4 board corners, in same order)
  const halfTW = TRAP_TOP_W / 2
  const halfTD = TRAP_TOP_D / 2
  const trapTopCorners: [number, number, number][] = [
    [-halfTW, TRAP_TOP_Y,  halfTD], // bottom-left of board → front-left of trap top
    [ halfTW, TRAP_TOP_Y,  halfTD], // bottom-right         → front-right
    [ halfTW, TRAP_TOP_Y, -halfTD], // top-right            → back-right
    [-halfTW, TRAP_TOP_Y, -halfTD], // top-left             → back-left
  ]

  return (
    <group>
      {/* Board background plate — slightly larger than the cell envelope,
          dark anodized, cyan rim. The cells sit at z=0; this plate at z=-0.05
          so it reads as a "wall" behind them. */}
      <group position={[0, BOARD_CENTER_Y, BOARD_FACE_Z - 0.06]}>
        <mesh receiveShadow>
          <boxGeometry args={[boardW, boardH, 0.08]} />
          <meshPhysicalMaterial
            color="#0c111c"
            metalness={0.25}
            roughness={0.78}
            emissive="#04162a"
            emissiveIntensity={0.18}
            envMapIntensity={0.3}
          />
          <Edges color="#00b2ff" threshold={1} lineWidth={1.5} />
        </mesh>
      </group>

      {/* All Lion Cove cells laid out flat on the X-Y plane */}
      <group position={[0, BOARD_CENTER_Y, 0]}>
        {children.map((child) => (
          <BoardCell key={child.id} spec={child} />
        ))}
      </group>

      {/* Trapezium podium — wide base, narrow top, sloped sides */}
      <mesh geometry={trapGeom} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#1a222d"
          metalness={0.4}
          roughness={0.5}
          clearcoat={0.5}
          clearcoatRoughness={0.4}
          emissive="#0a3a55"
          emissiveIntensity={0.35}
          envMapIntensity={0.8}
        />
        <Edges color="#00b2ff" threshold={1} lineWidth={1.8} />
      </mesh>

      {/* Trapezium label — engraved on the FRONT slanted face */}
      <Text
        position={[0, (TRAP_BOT_Y + TRAP_TOP_Y) / 2, TRAP_BOT_D / 2 + 0.02]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color={LABEL_COLOR}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        outlineWidth={0.018}
        outlineColor={LABEL_OUTLINE}
      >
        {ctx.block.label}
      </Text>

      {/* 4 corner projection lines: board corner → trapezium top corner */}
      {boardCornersFront.map((boardPt, i) => (
        <Line
          key={`proj-${i}`}
          points={[boardPt, trapTopCorners[i]]}
          color="#00b2ff"
          lineWidth={1.6}
          transparent
          opacity={0.82}
        />
      ))}
    </group>
  )
}
