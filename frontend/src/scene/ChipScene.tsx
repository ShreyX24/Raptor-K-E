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
import { chipSpec } from '@/data/chip-spec'
import { packChildren } from '@/util/packChildren'
import { useChoreographer } from '@/camera/Choreographer'

/**
 * L0 chiplet layout — PHYSICAL DIE-SHOT (per LAYER-PLAN.md).
 *   - Compute Tile (top-left)        - GPU Tile (top-right)
 *   - IOE Tile     (bottom-left)     - SoC Tile (bottom-right)
 *
 * Per user direction: actual mm² is NOT preserved visually — placement matters,
 * not relative size. Equal-quadrant grid for readable hover targets.
 */
// Real LGA1851 package is portrait: ~37.5mm wide × 45mm tall.
// Base is shaped the same way — narrower in X, longer in Z — so the chip's
// "head" (north edge, +cards face / Compute+GPU row) reads as the SHORT edge
// at the top of the screen and the "tail" (south edge / IOE+SoC row) as the
// short edge at the bottom. Reference: F:\Raptor-K-E\reference images\processor-s-l400.jpg
const BASE_W = 12 // X (width = short axis)
const BASE_D = 18 // Z (depth = long axis, head→tail)

// Lift chiplets ~0.7 above the base top (base top = 0.15, chiplet bottom = 0.5)
// so each chiplet visibly floats and casts a cyan underglow on the substrate.
const Y_REST = 0.9
const CHIPLET_H = 0.5

// 2×2 portrait grid. Each chiplet is taller (Z) than wide (X) to match
// the package aspect ratio. 1-unit gap between adjacent chiplets so the dark
// substrate shows through the "cracks".
const L0_LAYOUT: Record<
  string,
  { x: number; z: number; w: number; d: number }
> = {
  // Top row (north / head) — Compute + GPU, taller-than-wide chiplets
  compute: { x: -3, z: -4, w: 5, d: 7 },
  gpu:     { x:  3, z: -4, w: 5, d: 7 },
  // Bottom row (south / tail) — IOE + SoC
  ioe:     { x: -3, z:  4, w: 5, d: 7 },
  soc:     { x:  3, z:  4, w: 5, d: 7 },
}

export function ChipScene() {
  // Look up the BlockSpec for each L0 tile (drives the recursive Block subtree)
  const l0TileSpecs = (chipSpec.children ?? []).filter((c) => c.id in L0_LAYOUT)

  // CameraControls ref shared with the choreographer hook
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  useChoreographer(controlsRef)

  return (
    <Canvas
      // Phase 3 still measuring with r3f-perf; switch back to "demand" in Phase 4.
      frameloop="always"
      dpr={[1, 2]}
      shadows
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
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 30, 70]} />

      <Lighting />

      <Suspense fallback={null}>
        <EnvironmentSetup />
      </Suspense>

      <BaseTile width={BASE_W} depth={BASE_D} />

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
