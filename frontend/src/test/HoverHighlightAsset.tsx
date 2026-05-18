/**
 * HoverHighlightAsset — first reusable asset in /test.
 *
 * Spec (locked 2026-05-19):
 *   S5  top (+Y)         → 100% transparent (invisible)
 *   S1..S4 sides         → light-blue/cyan, alpha 0.60 at bottom → 0.00 at top,
 *                          colour fades from bright at bottom → dim at top
 *   V3 V4 V7 V8 top corners → fully-bright light-blue/cyan (no transparency)
 *   E3 E7 E11 E12 top edges → thin, lighter light-blue/cyan, ~75% opacity
 *   S6  bottom (−Y)       → opaque status colour (deep blue / purple / emerald / ruby)
 *
 * No reflections / no PBR yet — just colours, matching cell-color.jpg palette.
 *
 * Vertex / edge / surface IDs follow the convention defined in TestCuboid.tsx.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Line, Text } from '@react-three/drei'

import { SILICON_FONT_URL } from '@/hud/fonts'

// Dimensions match TestCuboid for direct A/B comparison
const W = 8
const H = 4.5
const D = 6
const hw = W / 2
const hh = H / 2
const hd = D / 2

// Default side / edge / vert colours — saturated cyan/turquoise (matches
// cell-color.jpg). Error tiles override these with red equivalents.
const DEFAULT_SIDE_COLOR      = '#22d3ee'
const DEFAULT_TOP_EDGE_COLOR  = '#a5f3fc'
const DEFAULT_TOP_VERT_COLOR  = '#ecfeff'

/**
 * Side-face shader.
 *
 *   - discards S5 (top) and S6 (bottom) — they're handled separately
 *   - on the 4 side faces, alpha and brightness ramp from bottom (bright,
 *     a=0.6) to top (transparent, a=0)
 */
const VERT = /* glsl */ `
varying float vLocalY;
varying vec3  vNormalLocal;
void main() {
  vLocalY      = position.y;
  vNormalLocal = normal;
  gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3  uSideColor;
uniform float uHalfHeight;
varying float vLocalY;
varying vec3  vNormalLocal;

void main() {
  // S5 top → invisible
  if (vNormalLocal.y >  0.5) discard;
  // S6 bottom rendered separately as a solid plane
  if (vNormalLocal.y < -0.5) discard;

  // t = 0 at bottom of face → 1 at top
  float t = clamp((vLocalY + uHalfHeight) / (2.0 * uHalfHeight), 0.0, 1.0);

  // Side stays visible all the way up (not full-transparent at top).
  float alpha      = mix(0.70, 0.15, t);
  float brightness = mix(1.00, 0.85, t);

  // Bottom "hot stripe" — strong horizontal glow at the base of each face.
  // smoothstep(0.08, 0.0, t) → 1 at t=0, 0 at t≥0.08
  float hot   = smoothstep(0.08, 0.0, t);
  brightness *= (1.0 + 0.40 * hot);
  alpha       = clamp(alpha + 0.30 * hot, 0.0, 1.0);

  vec3 col = uSideColor * brightness;
  gl_FragColor = vec4(col, alpha);
}
`

export interface HoverHighlightAssetProps {
  position: [number, number, number]
  /** S6 (bottom) face colour — the per-tile status marker */
  statusColor: string
  /** Floating label rendered above the asset, identifies the status variant */
  statusLabel: string
  /** S1..S4 side gradient base. Defaults to saturated cyan; pass red family for error tiles. */
  sideColor?: string
  /** E3/E7/E11/E12 top-edge rim colour. Defaults to lighter cyan. */
  topEdgeColor?: string
  /** V3/V4/V7/V8 top-vertex highlight colour. Defaults to lightest cyan. */
  topVertColor?: string
}

export function HoverHighlightAsset({
  position,
  statusColor,
  statusLabel,
  sideColor    = DEFAULT_SIDE_COLOR,
  topEdgeColor = DEFAULT_TOP_EDGE_COLOR,
  topVertColor = DEFAULT_TOP_VERT_COLOR,
}: HoverHighlightAssetProps) {
  // New uniforms object when sideColor changes so the shader picks it up.
  const uniforms = useMemo(
    () => ({
      uSideColor:   { value: new THREE.Color(sideColor) },
      uHalfHeight:  { value: hh },
    }),
    [sideColor]
  )

  // Top corners — V3 V4 V7 V8
  const topVerts: [number, number, number][] = [
    [+hw, +hh, +hd], // V3
    [-hw, +hh, +hd], // V4
    [+hw, +hh, -hd], // V7
    [-hw, +hh, -hd], // V8
  ]

  // Top-face perimeter edges — E3 (V3→V4), E7 (V7→V8), E11 (V3→V7), E12 (V4→V8)
  const topEdges: [[number, number, number], [number, number, number]][] = [
    [[+hw, +hh, +hd], [-hw, +hh, +hd]], // E3  front-top
    [[+hw, +hh, -hd], [-hw, +hh, -hd]], // E7  back-top
    [[+hw, +hh, +hd], [+hw, +hh, -hd]], // E11 right-top
    [[-hw, +hh, +hd], [-hw, +hh, -hd]], // E12 left-top
  ]

  return (
    <group position={position}>
      {/* Side faces — gradient cyan/blue, transparent toward top */}
      <mesh>
        <boxGeometry args={[W, H, D]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* S6 bottom face — solid status colour, opaque */}
      <mesh position={[0, -hh, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial color={statusColor} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Top vertex highlights — bright, opaque points at V3 V4 V7 V8 */}
      {topVerts.map((p, i) => (
        <mesh key={`v-${i}`} position={p}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={topVertColor} toneMapped={false} />
        </mesh>
      ))}

      {/* Top edges — brighter, thicker rim around the open top */}
      {topEdges.map((seg, i) => (
        <Line
          key={`e-${i}`}
          points={seg}
          color={topEdgeColor}
          lineWidth={3.0}
          transparent
          opacity={0.95}
        />
      ))}

      {/* Floating status label */}
      <Text
        position={[0, hh + 1.0, hd + 0.4]}
        font={SILICON_FONT_URL}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {statusLabel}
      </Text>
    </group>
  )
}
