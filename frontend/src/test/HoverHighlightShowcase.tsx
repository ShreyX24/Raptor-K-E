/**
 * HoverHighlightShowcase — single hover/highlight cuboid + a row of clickable
 * S6 status-color swatches. Click a swatch to swap the cuboid's bottom face
 * color (the per-tile "quality" marker).
 *
 * Mounted inside the /test Canvas at the top-left position. State (active
 * status index) is local — no zustand needed for this asset preview.
 */
import { useState } from 'react'
import { Edges, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

import { SILICON_FONT_URL } from '@/hud/fonts'
import { HoverHighlightAsset } from './HoverHighlightAsset'

/**
 * Candidate S6 colors — the per-tile quality marker. Names match what the
 * renderer will eventually map to (nominal / info / optimal / error from EMON
 * log values).
 *
 * `errorTheme` overrides the side / top-edge / top-vert colour family for
 * "error" tiles — the WHOLE highlight goes red, not just the S6 base.
 */
const CYAN_THEME = {
  side: '#22d3ee',
  edge: '#a5f3fc',
  vert: '#ecfeff',
}
const RED_THEME = {
  side: '#f43f5e',
  edge: '#fda4af',
  vert: '#ffe4e6',
}

type StatusVariant = {
  color: string
  label: string
  short: string
  /** When true, side faces + top edges + top verts use the red family */
  errorTheme?: boolean
}

const STATUS_VARIANTS: StatusVariant[] = [
  { color: '#1e3a8a', label: 'S6 · DEEP BLUE',    short: 'DEEP BLUE' },
  { color: '#7c3aed', label: 'S6 · PURPLE',       short: 'PURPLE'    },
  { color: '#10b981', label: 'S6 · EMERALD',      short: 'EMERALD'   },
  { color: '#e11d48', label: 'S6 · RUBY (ERROR)', short: 'RUBY',     errorTheme: true },
]

// Swatch geometry
const SWATCH_W   = 1.8
const SWATCH_H   = 0.22
const SWATCH_D   = 1.8
const SWATCH_PITCH = 2.4        // x-distance between swatch centres
const SWATCH_ROW_Y = -5.0       // below the cuboid (cuboid bottom is at y≈-2.25)

interface SwatchProps {
  position: [number, number, number]
  color: string
  label: string
  active: boolean
  onClick: () => void
}

function Swatch({ position, color, label, active, onClick }: SwatchProps) {
  return (
    <group position={position}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[SWATCH_W, SWATCH_H, SWATCH_D]} />
        <meshBasicMaterial color={color} toneMapped={false} />
        <Edges
          color={active ? '#22d3ee' : '#1e4055'}
          lineWidth={active ? 2.5 : 1.0}
        />
      </mesh>

      {/* Active ring above the swatch (a thicker glow indicator) */}
      {active && (
        <mesh position={[0, SWATCH_H / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[SWATCH_W * 0.62, SWATCH_W * 0.74, 32]} />
          <meshBasicMaterial color="#a5f3fc" toneMapped={false} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Label below */}
      <Text
        position={[0, -0.75, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.30}
        color={active ? '#ecfeff' : '#5fa0c7'}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        outlineWidth={0.025}
        outlineColor="#000814"
      >
        {label}
      </Text>
    </group>
  )
}

export function HoverHighlightShowcase() {
  const [statusIdx, setStatusIdx] = useState(0)
  const active = STATUS_VARIANTS[statusIdx]

  // Centre the row of 4 swatches horizontally around x = 0
  const firstX = -((STATUS_VARIANTS.length - 1) * SWATCH_PITCH) / 2

  return (
    <group>
      {/* Section label above the asset */}
      <Text
        position={[0, 5.5, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.75}
        color="#cfeaff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        HOVER / HIGHLIGHT
      </Text>
      <Text
        position={[0, 4.55, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.42}
        color="#9fd6ff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        outlineWidth={0.035}
        outlineColor="#001020"
      >
        asset 01 · {active.short}
      </Text>

      {/* The one cuboid, S6 colour + whole-theme driven by the picker */}
      <HoverHighlightAsset
        position={[0, 0, 0]}
        statusColor={active.color}
        statusLabel={active.label}
        sideColor   ={active.errorTheme ? RED_THEME.side : CYAN_THEME.side}
        topEdgeColor={active.errorTheme ? RED_THEME.edge : CYAN_THEME.edge}
        topVertColor={active.errorTheme ? RED_THEME.vert : CYAN_THEME.vert}
      />

      {/* Row of clickable S6 colour swatches */}
      {STATUS_VARIANTS.map((variant, i) => (
        <Swatch
          key={variant.label}
          position={[firstX + i * SWATCH_PITCH, SWATCH_ROW_Y, 0]}
          color={variant.color}
          label={variant.short}
          active={i === statusIdx}
          onClick={() => setStatusIdx(i)}
        />
      ))}

      {/* Picker caption */}
      <Text
        position={[0, SWATCH_ROW_Y - 1.6, 0]}
        font={SILICON_FONT_URL}
        fontSize={0.28}
        color="#7ec8ff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
        outlineWidth={0.022}
        outlineColor="#000814"
      >
        click a swatch · S6 status colour
      </Text>
    </group>
  )
}
