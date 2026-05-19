/**
 * ChipScene — the top-level <Canvas> with renderer config, lighting, scene content, post-FX.
 *
 * Phase 3 L0+drill: static BaseTile substrate with 4 chiplets resting on top in
 * their 2D footprint per the PHYSICAL die-shot (Compute TL / GPU TR / IOE BL /
 * SoC BR). Layer renders the L0 chiplet visuals (cyan glass + hover lift). Block
 * renders L1+ recursive subtrees, which mount once at startup and toggle
 * visibility via focusPath. Click an L0 tile → drill to L1.
 *
 * Per skill r3f-patterns.md: AgX, ColorManagement enabled, SMAA in post-FX so we
 * disable native antialias. frameloop="always" while we still measure with
 * r3f-perf; switches back to "demand" once Phase 4 wires invalidate().
 */
import { Fragment, Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Edges, RoundedBox } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import type CameraControlsImpl from 'camera-controls'

import { Lighting } from './Lighting'
import { EnvironmentSetup } from './EnvironmentSetup'
import { PostFX } from './PostFX'
import { Layer } from './Layer'
import { Block, DRILL_GAP } from './Block'
import { BaseTile } from './BaseTile'
import { IHS } from './IHS'
import { ContextProjector } from './ContextProjector'
import { ComputeBoardProjector } from './ComputeBoardProjector'
import { chipSpec } from '@/data/chip-spec'
import { layoutChildren } from '@/util/packChildren'
import { useChoreographer } from '@/camera/Choreographer'
import { useStore } from '@/state/store'
import { computeContextInfo } from '@/util/contextMode'

/**
 * L0 chiplet layout — ARL family floorplan (200S / 200S+).
 *
 * Reference: F:\Raptor-K-E\reference images\Screenshot 2026-05-18 203104.png
 *
 * Per user direction (2026-05-19 iteration):
 *   - All tiles "less square" → SoC's height reduced and donated to the top
 *     section, which now hosts a tall vertical-rectangle Compute Tile next
 *     to a left column of stacked EMPTY (strengthening) + IO tiles.
 *   - Empty strengthening tile re-added on top-left, sitting ABOVE the
 *     IO Tile and LEFT of the Compute Tile — mirrors the structural
 *     17.47 mm² block in the actual ARL die-shot.
 *
 *   Top section:    [EMPTY ]   |
 *                   [ IO   ]   |   COMPUTE (vertical rect, w=7 d=8)
 *   Middle:         SoC Tile  (full width, height 2.5)
 *   Bottom:         GPU Tile  (full width, height 2.5)
 *
 * All neighbours share boundary edges; chip footprint = 10 × 13 (X × Z).
 * Tiles placed so neighbours share X / Z edges exactly:
 *   empty.bottom == ioe.top     == -5.5
 *   ioe.right    == compute.left  == -2
 *   ioe.bottom   == compute.bottom == +0.5 (== soc.top)
 *   soc.bottom   == gpu.top      == +3
 */
const BASE_W = 11
const BASE_D = 14

const Y_REST = 0.9
const CHIPLET_H = 0.5

/**
 * Per-tile dims, positions, and frosted-glass tints.
 *
 * Each tile is uniformly shrunk by SHRINK=0.06 on each side → 0.12 visible
 * gap between adjacent tiles. Position centers stay on the "nominal" grid
 * so neighbours don't drift.
 *
 * Tints picked to match the user's Screenshot 2026-05-18 203104.png mockup:
 *   IOE = sage green   ·  Compute = amber/orange
 *   SoC = violet       ·  GPU      = pink/salmon
 */
const SHRINK = 0.06

const L0_LAYOUT: Record<
  string,
  { x: number; z: number; w: number; d: number; color: string; emissive: string }
> = {
  // Top section — d=8 total, z ∈ [-6.5, +1.5]. Left column (nominal w=3)
  // holds EMPTY (top, d=2) stacked above IOE (d=6). Right (nominal w=7)
  // is Compute spanning the full top-section depth (vertical rectangle).
  ioe: {
    x: -3.5, z: -1.5, w: 3 - SHRINK * 2, d: 6 - SHRINK * 2,
    color: '#86efac', emissive: '#1d5238',
  },
  compute: {
    x: 1.5, z: -2.5, w: 7 - SHRINK * 2, d: 8 - SHRINK * 2,
    color: '#f59e0b', emissive: '#7c4309',
  },
  // Middle — SoC bumped d=2.5 → d=3 (got 0.5 from GPU)
  soc: {
    x: 0, z: 3, w: 10 - SHRINK * 2, d: 3 - SHRINK * 2,
    color: '#a78bfa', emissive: '#3e1f8e',
  },
  // Bottom — GPU shrunk d=2.5 → d=2 (donated to SoC)
  gpu: {
    x: 0, z: 5.5, w: 10 - SHRINK * 2, d: 2 - SHRINK * 2,
    color: '#fca5a5', emissive: '#6e1f1f',
  },
}

/**
 * Empty strengthening tile — mirrors the structural 17.47 mm² block in the
 * ARL die-shot. Sits TOP-LEFT, above IOE, left of Compute. Same shrink as
 * the other tiles so the inter-tile gap reads consistently. SILVER finish
 * (no PMU, no children, no drill, no hover-lift).
 */
const EMPTY_TILE = {
  x: -3.5,
  z: -5.5,
  w: 3 - SHRINK * 2,
  d: 2 - SHRINK * 2,
} as const

/**
 * GradientBackground — replaces the solid background with a 4-stop
 * horizontal gradient. Stops sampled from user references (2026-05-19):
 *
 *   0%    #132262   dark indigo   RGB(19, 34, 98)
 *   33%   #255cc0   rich blue     RGB(37, 92, 192)
 *   66%   #85bcff   light blue    RGB(133, 188, 255)  ← bright spot
 *   100%  #2f4e93   slate blue    RGB(47, 78, 147)
 *
 * Builds a 1024 × 256 CanvasTexture and sets scene.background — that
 * renders as a flat backdrop projected to the viewport, so the gradient
 * stays oriented left → right regardless of camera position.
 */
function GradientBackground() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 256
    const ctx = c.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 1024, 0)
    grad.addColorStop(0.00, '#132262')
    grad.addColorStop(0.33, '#255cc0')
    grad.addColorStop(0.66, '#85bcff')
    grad.addColorStop(1.00, '#2f4e93')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1024, 256)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const prev = scene.background
    scene.background = tex
    return () => {
      scene.background = prev
      tex.dispose()
    }
  }, [scene])
  return null
}

/**
 * EmptyStrengtheningTile — static metallic plate at the top-left corner of
 * the chip outline, above the IO tile and left of the Compute tile. No PMU,
 * no children, no hover-lift, no click. Just structural support, mirroring
 * the 17.47 mm² empty piece in the real ARL die-shot.
 *
 * Opacity follows bootState (hidden while IHS lid is on) plus the same
 * "fade siblings when drilled" rule as the L0 chiplets — so when the user
 * drills into Compute / IOE / SoC / GPU, the empty piece also fades.
 */
function EmptyStrengtheningTile({
  x,
  z,
  w,
  d,
  y,
  h,
}: {
  x: number
  z: number
  w: number
  d: number
  y: number
  h: number
}) {
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const focusPath = useStore((s) => s.focusPath)
  const bootState = useStore((s) => s.bootState)

  // Match the L0 chiplet visibility rules: full while ground state + delidded;
  // sibling-faded while a chiplet is drilled; hidden under the lid OR in
  // context mode (so the Compute board / Lion Cove board fills the viewport
  // without this little silver piece floating in the corner).
  useFrame((state, dt) => {
    const m = matRef.current
    const g = groupRef.current
    if (!m || !g) return

    const contextActive = computeContextInfo(focusPath).active

    let target = 1.0
    if (bootState === 'lidded') target = 0
    else if (contextActive) target = 0
    else if (focusPath.length > 0) target = 0.08

    m.opacity = THREE.MathUtils.damp(m.opacity, target, 6, dt)
    g.visible = m.opacity > 0.01

    if (Math.abs(m.opacity - target) > 0.002) state.invalidate()
  })

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <RoundedBox
        args={[w, h, d]}
        radius={0.04}
        smoothness={4}
        creaseAngle={0.4}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          ref={matRef}
          // FULLY MATTE silver-tinted gray. Per user direction: "remove
          // the shine please". metalness=0 + roughness=1 + envMap=0 →
          // pure Lambertian, no specular at all. Reads as silver via base
          // colour alone, no PBR sheen.
          color="#B8B8B8"
          metalness={0.0}
          roughness={1.0}
          clearcoat={0.0}
          envMapIntensity={0.0}
          transparent
          opacity={1.0}
        />
        <Edges color="#cccccc" threshold={15} lineWidth={0.9} transparent opacity={0.4} />
      </RoundedBox>
    </group>
  )
}

export function ChipScene() {
  // Look up the BlockSpec for each L0 tile (drives the recursive Block subtree)
  const l0TileSpecs = (chipSpec.children ?? []).filter((c) => c.id in L0_LAYOUT)

  // CameraControls ref shared with the choreographer hook
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  useChoreographer(controlsRef)

  return (
    <Canvas
      // Phase 4 M11: switched to "demand". Each animated useFrame in the scene
      // calls state.invalidate() while still in motion (Layer / Block / IHS).
      // Pointer events auto-invalidate. CRITICAL severity blocks keep
      // invalidating intentionally (the pulse never settles). Result: idle
      // scenes stop drawing, saving battery on laptops without sacrificing
      // animation smoothness.
      frameloop="demand"
      dpr={[1, 2]}
      // BUG-011 fix: pin shadow map type to PCFShadowMap explicitly. Default
      // `shadows` resolves to PCFSoftShadowMap which Three.js has deprecated.
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      // Phase 4: app boots in 'lidded' state — start at IHS view (ELEV=65°, dist=32).
      // Choreographer transitions to canonical L0 (72°/0°/36) once bootState delidded.
      // sin(65°)≈0.906 → camY = 2 + 32*0.906 = 31.0 ; cos(65°)≈0.423 → camZ = 32*0.423 = 13.5
      camera={{ position: [0, 31.0, 13.5], fov: 38, near: 0.1, far: 100 }}
      onCreated={({ gl }) => {
        THREE.ColorManagement.enabled = true
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.AgXToneMapping
        gl.toneMappingExposure = 1.0
      }}
    >
      {/* BUG-004 fix: aligned with the body background token `oklch(0.18 0.02 250)`
          via the closest sRGB equivalent. Three.js r166+ supports oklch via
          setStyle but `<color args>` takes a string passed straight to Color
          which doesn't parse oklch — so we use the precomputed hex. */}
      {/* Horizontal 4-stop gradient — dark blue / blue / light blue / slate.
          Set on scene.background via GradientBackground hook below; the
          fog colour is the midpoint so distant geometry fades gracefully
          into the gradient instead of toward the old near-black. */}
      <GradientBackground />
      <fog attach="fog" args={['#2c447a', 35, 90]} />

      <Lighting />

      <Suspense fallback={null}>
        <EnvironmentSetup />
      </Suspense>

      <BaseTile width={BASE_W} depth={BASE_D} />

      {/* IHS — covers the chiplets while bootState='lidded'; lifts+fades during 'delidding' */}
      <IHS width={BASE_W} depth={BASE_D} />

      {/* Structural strengthening piece — top-left corner, above IO, left of Compute */}
      <EmptyStrengtheningTile
        x={EMPTY_TILE.x}
        z={EMPTY_TILE.z}
        w={EMPTY_TILE.w}
        d={EMPTY_TILE.d}
        y={Y_REST}
        h={CHIPLET_H}
      />

      {/* L0 chiplets (cyan glass) + L1+ recursive Block subtrees (anodized aluminum) */}
      {l0TileSpecs.map((tileSpec) => {
        const t = L0_LAYOUT[tileSpec.id]
        // Top-down drill for COMPUTE only: L1 lives INSIDE the L0 box (same Y
        // as L0 plate's centre). The translucent frosted-glass L0 above lets
        // the L1 cores / L3 slices / ring agent read through "just a tad".
        // All other tiles still drill UP via DRILL_GAP (existing convention).
        const childY =
          tileSpec.id === 'compute'
            ? Y_REST
            : Y_REST + CHIPLET_H / 2 + DRILL_GAP
        const l1Children = tileSpec.children
          ? layoutChildren(tileSpec, tileSpec.children, t.x, t.z, t.w, t.d)
          : []

        return (
          <Fragment key={tileSpec.id}>
            <Layer
              tileId={tileSpec.id}
              position={[t.x, Y_REST, t.z]}
              width={t.w}
              depth={t.d}
              height={CHIPLET_H}
              label={tileSpec.label}
              color={t.color}
              emissive={t.emissive}
            />
            {/* L1 subtree — mounted once, visibility gated by focusPath inside Block */}
            {l1Children.map(({ child, x, z, w, d }) => (
              <Block
                key={child.id}
                spec={child}
                position={[x, childY, z]}
                width={w}
                depth={d}
                drillDepth={1}
                parentTileId={tileSpec.id}
              />
            ))}
          </Fragment>
        )
      })}

      {/* Context mode: 3D projector trapezium + 4 corner-to-corner lines */}
      <ContextProjector />
      {/* Compute tile context — L1 floorplan as a perpendicular board */}
      <ComputeBoardProjector />

      <CameraControls ref={controlsRef} makeDefault smoothTime={0.6} />
      <PostFX />

      {/* Perf temporarily disabled — its chart/history bars draw black spikes
          over the canvas now that the background is bright. Re-enable with
          minimal={true} once that mode is verified. */}
      {/* {import.meta.env.DEV && <Perf position="bottom-left" />} */}
    </Canvas>
  )
}
