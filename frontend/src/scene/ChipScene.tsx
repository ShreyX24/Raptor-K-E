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
import { Fragment, Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import type CameraControlsImpl from 'camera-controls'

import { Lighting } from './Lighting'
import { EnvironmentSetup } from './EnvironmentSetup'
import { PostFX } from './PostFX'
import { Layer } from './Layer'
import { Block, DRILL_GAP } from './Block'
import { BaseTile } from './BaseTile'
import { IHS } from './IHS'
import { FillerTile } from './FillerTile'
import { chipSpec } from '@/data/chip-spec'
import { packChildren } from '@/util/packChildren'
import { useChoreographer } from '@/camera/Choreographer'

/**
 * L0 chiplet layout — ARL family floorplan (200S / 200S+).
 *
 * Reference: F:\Raptor-K-E\reference images\Screenshot 2026-05-18 203104.png
 *
 * Top section (north half):
 *   - empty strengthening filler tile (top-left, small)
 *   - IO Tile (bottom-left, under filler)
 *   - Compute Tile (right, LARGE — spans full top-section height)
 * Middle: SoC Tile (full width)
 * Bottom: GPU Tile (full width, shorter band)
 *
 * Not a 2×2 quadrant grid. Real ARL packages place Compute as the dominant
 * top-right tile with IO + a structural filler die stacked on its left.
 */
const BASE_W = 12
const BASE_D = 18

const Y_REST = 0.9
const CHIPLET_H = 0.5

// Top-section X split: left column at x≈-3.25 (width 3.5), Compute at x≈2 (width 6)
// Z bands (north → south):
//   filler:    z = -7  (depth 2.5)
//   ioe:       z = -3.75 (depth 3.5)   — totals 6 with filler, equal to Compute height
//   compute:   z = -5   (depth 6)
//   soc:       z = 1.75 (depth 5)
//   gpu:       z = 6.75 (depth 3)
const L0_LAYOUT: Record<
  string,
  { x: number; z: number; w: number; d: number }
> = {
  compute: { x:  2,    z: -5,    w: 6,   d: 6   },
  ioe:     { x: -3.25, z: -3.75, w: 3.5, d: 3.5 },
  soc:     { x:  0,    z:  1.75, w: 10,  d: 5   },
  gpu:     { x:  0,    z:  6.75, w: 10,  d: 3   },
}

// Non-interactive structural filler — top-left corner above IOE
const FILLER_LAYOUT = { x: -3.25, z: -7, w: 3.5, d: 2.5 } as const

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
      <color attach="background" args={['#1c2230']} />
      <fog attach="fog" args={['#1c2230', 30, 70]} />

      <Lighting />

      <Suspense fallback={null}>
        <EnvironmentSetup />
      </Suspense>

      <BaseTile width={BASE_W} depth={BASE_D} />

      {/* Structural filler die (top-left). Non-interactive — no drill, no hover. */}
      <FillerTile
        position={[FILLER_LAYOUT.x, Y_REST, FILLER_LAYOUT.z]}
        width={FILLER_LAYOUT.w}
        depth={FILLER_LAYOUT.d}
        height={CHIPLET_H}
      />

      {/* IHS — covers the chiplets while bootState='lidded'; lifts+fades during 'delidding' */}
      <IHS width={BASE_W} depth={BASE_D} />

      {/* L0 chiplets (cyan glass) + L1+ recursive Block subtrees (anodized aluminum) */}
      {l0TileSpecs.map((tileSpec) => {
        const t = L0_LAYOUT[tileSpec.id]
        // L1 children are packed into the tile's footprint, raised by DRILL_GAP
        const childY = Y_REST + CHIPLET_H / 2 + DRILL_GAP
        const l1Children = tileSpec.children
          ? packChildren(tileSpec.children, t.x, t.z, t.w, t.d)
          : []

        return (
          <Fragment key={tileSpec.id}>
            <Layer
              tileId={tileSpec.id}
              position={[t.x, Y_REST, t.z]}
              width={t.w}
              depth={t.d}
              height={CHIPLET_H}
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

      <CameraControls ref={controlsRef} makeDefault smoothTime={0.6} />
      <PostFX />

      {import.meta.env.DEV && <Perf position="bottom-left" />}
    </Canvas>
  )
}
