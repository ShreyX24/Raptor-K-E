/**
 * TestCuboid — a single CPU-tile-shaped cuboid in isolation with every
 * vertex, edge, and surface labeled.
 *
 * Coordinate vocabulary (so user + dev can refer to specific features without
 * ambiguity):
 *
 *   Vertices V1..V8:
 *     V1 = bottom-front-left  (−x, −y, +z)
 *     V2 = bottom-front-right (+x, −y, +z)
 *     V3 = top-front-right    (+x, +y, +z)
 *     V4 = top-front-left     (−x, +y, +z)
 *     V5 = bottom-back-left   (−x, −y, −z)
 *     V6 = bottom-back-right  (+x, −y, −z)
 *     V7 = top-back-right     (+x, +y, −z)
 *     V8 = top-back-left      (−x, +y, −z)
 *
 *   Edges E1..E12:
 *     Front face (z = +d/2):
 *       E1  V1 → V2  (front-bottom)
 *       E2  V2 → V3  (front-right)
 *       E3  V3 → V4  (front-top)
 *       E4  V4 → V1  (front-left)
 *     Back face (z = −d/2):
 *       E5  V5 → V6  (back-bottom)
 *       E6  V6 → V7  (back-right)
 *       E7  V7 → V8  (back-top)
 *       E8  V8 → V5  (back-left)
 *     Connecting (front → back):
 *       E9   V1 → V5  (bottom-left)
 *       E10  V2 → V6  (bottom-right)
 *       E11  V3 → V7  (top-right)
 *       E12  V4 → V8  (top-left)
 *
 *   Surfaces S1..S6:
 *     S1 = +Z front  (V1 V2 V3 V4)
 *     S2 = +X right  (V2 V6 V7 V3)
 *     S3 = −Z back   (V6 V5 V8 V7)
 *     S4 = −X left   (V5 V1 V4 V8)
 *     S5 = +Y top    (V4 V3 V7 V8)
 *     S6 = −Y bottom (V5 V6 V2 V1)
 *
 * Same convention will be re-used once the user gives precise per-feature
 * styling instructions (e.g. "S5 emissive #00ffff at intensity 1.2", or
 * "E11 thicker line").
 */
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Edges, Text, Environment } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { Perf } from 'r3f-perf'

import { SILICON_FONT_URL } from '@/hud/fonts'
import { HoverHighlightShowcase } from './HoverHighlightShowcase'
import { RestingTileAsset } from './RestingTileAsset'
import { HoverFrameAsset } from './HoverFrameAsset'

// Cuboid dimensions (X, Y, Z) — CPU-tile-ish but inflated for visibility.
const W = 8
const H = 4.5
const D = 6
const hw = W / 2 // half width
const hh = H / 2
const hd = D / 2

// Vertex world positions
const V: Record<string, [number, number, number]> = {
  V1: [-hw, -hh, +hd],
  V2: [+hw, -hh, +hd],
  V3: [+hw, +hh, +hd],
  V4: [-hw, +hh, +hd],
  V5: [-hw, -hh, -hd],
  V6: [+hw, -hh, -hd],
  V7: [+hw, +hh, -hd],
  V8: [-hw, +hh, -hd],
}

// Edge endpoints (label, vertexA, vertexB)
const E: { id: string; a: keyof typeof V; b: keyof typeof V }[] = [
  { id: 'E1',  a: 'V1', b: 'V2' },
  { id: 'E2',  a: 'V2', b: 'V3' },
  { id: 'E3',  a: 'V3', b: 'V4' },
  { id: 'E4',  a: 'V4', b: 'V1' },
  { id: 'E5',  a: 'V5', b: 'V6' },
  { id: 'E6',  a: 'V6', b: 'V7' },
  { id: 'E7',  a: 'V7', b: 'V8' },
  { id: 'E8',  a: 'V8', b: 'V5' },
  { id: 'E9',  a: 'V1', b: 'V5' },
  { id: 'E10', a: 'V2', b: 'V6' },
  { id: 'E11', a: 'V3', b: 'V7' },
  { id: 'E12', a: 'V4', b: 'V8' },
]

// Surface centers + outward normals (for label placement)
// pos = center of face, off = small offset in normal direction so text floats above face
const S: { id: string; pos: [number, number, number]; rot: [number, number, number] }[] = [
  { id: 'S1 · front (+Z)',  pos: [0,   0,  +hd + 0.01], rot: [0, 0, 0] },
  { id: 'S2 · right (+X)',  pos: [+hw + 0.01, 0,   0],  rot: [0,  Math.PI / 2, 0] },
  { id: 'S3 · back (−Z)',   pos: [0,   0,  -hd - 0.01], rot: [0,  Math.PI, 0] },
  { id: 'S4 · left (−X)',   pos: [-hw - 0.01, 0,   0],  rot: [0, -Math.PI / 2, 0] },
  { id: 'S5 · top (+Y)',    pos: [0,  +hh + 0.01, 0],   rot: [-Math.PI / 2, 0, 0] },
  { id: 'S6 · bottom (−Y)', pos: [0,  -hh - 0.01, 0],   rot: [+Math.PI / 2, 0, 0] },
]

// Midpoint helper
function mid(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

// Slightly nudge a label outward from the cuboid surface along the position vector
function nudge(p: [number, number, number], delta: number): [number, number, number] {
  const len = Math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2) || 1
  return [p[0] * (1 + delta / len), p[1] * (1 + delta / len), p[2] * (1 + delta / len)]
}

function CameraSetup({ ccRef }: { ccRef: RefObject<CameraControlsImpl | null> }) {
  useEffect(() => {
    // Frame everything in the /test scene:
    //   - V/E/S reference cuboid at origin (right)
    //   - asset 01 hover/highlight at x ≈ -18, y ≈ +2  (top-left)
    //   - asset 02 resting tiles  at x ≈ -18, y ≈ -12 (bottom-left)
    //   - asset 03 hover frame    at x ≈   0, y ≈ -12 (bottom-right)
    // Pulled back so all of them fit; lookAt biased toward the lower-left.
    ccRef.current?.setLookAt(8, 16, 44, -9, -3, 0, false)
  }, [ccRef])
  return <CameraControls ref={ccRef} makeDefault smoothTime={0.4} />
}

/**
 * FreeCameraController — when `enabled`, listens for WASD/Space/Shift and
 * shifts camera + target by the same delta each frame. Mouse orbit on
 * CameraControls keeps working alongside (you rotate around the new center).
 *
 *   W / S  — move forward / back along view direction (horizontal plane only)
 *   A / D  — strafe left / right (relative to view)
 *   Space  — lift up (+Y world)
 *   Shift  — drop down (-Y world)   [Ctrl is reserved by the browser — Ctrl+W
 *                                   closes the tab, so we use Shift instead]
 */
const FREE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'])
const FREE_CAM_SPEED = 18 // world units / sec

function FreeCameraController({
  ccRef,
  enabled,
}: {
  ccRef: RefObject<CameraControlsImpl | null>
  enabled: boolean
}) {
  const pressedRef = useRef<Set<string>>(new Set())
  const invalidate = useThree((s) => s.invalidate)

  // Hoisted scratch — avoids per-frame Vector3 allocations
  const target  = useMemo(() => new THREE.Vector3(), [])
  const pos     = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const right   = useMemo(() => new THREE.Vector3(), [])
  const delta   = useMemo(() => new THREE.Vector3(), [])
  const WORLD_UP = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useEffect(() => {
    if (!enabled) {
      pressedRef.current.clear()
      return
    }
    const onDown = (e: KeyboardEvent) => {
      if (FREE_KEYS.has(e.code)) {
        pressedRef.current.add(e.code)
        e.preventDefault()
        invalidate() // kick off frame loop while keys are held
      }
    }
    const onUp = (e: KeyboardEvent) => {
      pressedRef.current.delete(e.code)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      pressedRef.current.clear()
    }
  }, [enabled, invalidate])

  useFrame((_, dt) => {
    if (!enabled) return
    const cc = ccRef.current
    if (!cc) return
    if (pressedRef.current.size === 0) return

    const step = FREE_CAM_SPEED * Math.min(dt, 0.033) // cap dt on tab-switch jumps

    cc.getTarget(target)
    cc.getPosition(pos)

    forward.copy(target).sub(pos)
    forward.y = 0
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1) // looking straight up/down — fall back
    } else {
      forward.normalize()
    }
    right.copy(forward).cross(WORLD_UP).normalize()

    delta.set(0, 0, 0)
    const pressed = pressedRef.current
    if (pressed.has('KeyW')) delta.addScaledVector(forward,  step)
    if (pressed.has('KeyS')) delta.addScaledVector(forward, -step)
    if (pressed.has('KeyD')) delta.addScaledVector(right,    step)
    if (pressed.has('KeyA')) delta.addScaledVector(right,   -step)
    if (pressed.has('Space')) delta.y += step
    if (pressed.has('ShiftLeft') || pressed.has('ShiftRight')) delta.y -= step

    if (delta.lengthSq() > 0) {
      cc.setLookAt(
        pos.x + delta.x,    pos.y + delta.y,    pos.z + delta.z,
        target.x + delta.x, target.y + delta.y, target.z + delta.z,
        false,
      )
      invalidate() // keep the frame loop alive while keys are held
    }
  })

  return null
}

export function TestCuboid({ freeCamera = false }: { freeCamera?: boolean }) {
  const ccRef = useRef<CameraControlsImpl | null>(null)
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [8, 16, 44], fov: 42, near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        THREE.ColorManagement.enabled = true
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.AgXToneMapping
        gl.toneMappingExposure = 1.0
      }}
    >
      {/* Lighter purple-violet base — soothing, not dark-blue "empty space" */}
      <color attach="background" args={['#332e52']} />

      {/* Lighting — neutral so the cuboid reads cleanly */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 8]} intensity={1.2} color="#ffffff" castShadow />
      <pointLight position={[-8, 5, 8]} intensity={0.6} color="#7ec8ff" distance={30} decay={1.8} />
      <pointLight position={[0, -6, 0]}  intensity={0.5} color="#00b2ff" distance={20} decay={1.8} />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.35} background={false} />
      </Suspense>

      {/* The cuboid itself */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshPhysicalMaterial
          color="#1a222d"
          metalness={0.4}
          roughness={0.5}
          clearcoat={0.4}
          clearcoatRoughness={0.4}
          emissive="#0a3a55"
          emissiveIntensity={0.32}
          envMapIntensity={0.8}
        />
        <Edges color="#00b2ff" threshold={1} lineWidth={2} />
      </mesh>

      {/* Vertex labels — small spheres + V# text near each corner */}
      {(Object.keys(V) as (keyof typeof V)[]).map((vid) => {
        const p = V[vid]
        const labelPos = nudge(p, 0.6)
        return (
          <group key={vid}>
            <mesh position={p}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshBasicMaterial color="#ffe066" toneMapped={false} />
            </mesh>
            <Text
              position={labelPos}
              font={SILICON_FONT_URL}
              fontSize={0.5}
              color="#ffe066"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              {vid}
            </Text>
          </group>
        )
      })}

      {/* Edge labels — small marker at midpoint + E# text */}
      {E.map(({ id, a, b }) => {
        const m = mid(V[a], V[b])
        const labelPos = nudge(m, 0.45)
        return (
          <group key={id}>
            <mesh position={m}>
              <sphereGeometry args={[0.085, 12, 12]} />
              <meshBasicMaterial color="#7fffd4" toneMapped={false} />
            </mesh>
            <Text
              position={labelPos}
              font={SILICON_FONT_URL}
              fontSize={0.38}
              color="#7fffd4"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="#001a1a"
            >
              {id}
            </Text>
          </group>
        )
      })}

      {/* Surface labels — centered on each face, rotated to lie flat against it */}
      {S.map(({ id, pos, rot }) => (
        <Text
          key={id}
          position={pos}
          rotation={rot}
          font={SILICON_FONT_URL}
          fontSize={0.42}
          color="#ff7eb6"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.04}
          outlineWidth={0.035}
          outlineColor="#26000d"
        >
          {id}
        </Text>
      ))}

      {/* ────────────────────────────────────────────────────────────────
        HOVER / HIGHLIGHT ASSET (asset 01) — top-left.
        ONE cuboid + clickable swatch row picks the S6 status colour.
        cell-color.jpg = reference for colors only.
      ──────────────────────────────────────────────────────────────── */}
      <group position={[-18, 2, 0]}>
        <HoverHighlightShowcase />
      </group>

      {/* ────────────────────────────────────────────────────────────────
        RESTING / DEFAULT ASSET (asset 02) — bottom-left.
        Frosted-glass tiles laid out chip-style, per-tile tint, gaps.
        Reference: Presentation1_page-0002.jpg
      ──────────────────────────────────────────────────────────────── */}
      <group position={[-18, -12, 0]}>
        <RestingTileAsset />
      </group>

      {/* ────────────────────────────────────────────────────────────────
        HOVER ASSET (asset 03) — bottom-right.
        Row of 3 tiles: middle one is LIFTED + ringed with cyan frame
        (the page-007 hover state). Resting peers either side show the
        differential. NOT the highlight state — highlight is asset 01.
      ──────────────────────────────────────────────────────────────── */}
      <group position={[0, -12, 0]}>
        <HoverFrameAsset />
      </group>

      <CameraSetup ccRef={ccRef} />
      <FreeCameraController ccRef={ccRef} enabled={freeCamera} />

      {import.meta.env.DEV && <Perf position="bottom-left" />}
    </Canvas>
  )
}
