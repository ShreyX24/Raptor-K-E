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
// Base is larger than the chiplet grid so the substrate rim is visible
// around and between the chiplets (matches Intel Arc Day hero render).
const BASE_W = 18
const BASE_D = 14
// Lift chiplets ~0.7 above the base top (base top = 0.15, chiplet bottom = 0.5)
// so each chiplet visibly floats and casts a cyan underglow on the substrate.
const Y_REST = 0.9
const CHIPLET_H = 0.5

// 1-unit gap between adjacent chiplets so the dark substrate shows through
// the "cracks" — readability improvement over edge-to-edge tiles.
const L0_LAYOUT: Record<
  string,
  { x: number; z: number; w: number; d: number }
> = {
  compute: { x: -4.0, z: -3.0, w: 7, d: 5 },
  gpu:     { x:  4.0, z: -3.0, w: 7, d: 5 },
  ioe:     { x: -4.0, z:  3.0, w: 7, d: 5 },
  soc:     { x:  4.0, z:  3.0, w: 7, d: 5 },
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
      // Near-top-down initial position (matches Choreographer L0_CAMERA_POS).
      // At 75° elevation / 35° azimuth, distance ~24 from origin.
      camera={{ position: [3.5, 24, 5.2], fov: 38, near: 0.1, far: 100 }}
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
