/**
 * useChoreographer — subscribes to focusPath and dolls the camera via fitToBox.
 *
 * Per skill references/choreography.md:
 *   - Use drei <CameraControls> (wraps Yomotsu camera-controls v3.1.2)
 *   - await controls.fitToBox(box3, true, { padding... })
 *   - Sibling fade is handled INSIDE Block.tsx (each Block reacts to focusPath)
 *   - Parent shells stay as wireframe ghosts at opacity 0.15 (Layer + Block)
 *   - On Esc: focusPath.pop(), reverse via the same fitToBox call
 *
 * The focused block's box is expanded upward by DRILL_GAP + CHILD_HEIGHT so the
 * newly-revealed layer above is also framed in the camera view.
 *
 * Anti-patterns avoided per skill:
 *   - No setTimeout for camera arrival (fitToBox returns a Promise)
 *   - No setState from useFrame (this hook uses useEffect, not useFrame)
 */
import { useEffect, type RefObject } from 'react'
import * as THREE from 'three'
import type CameraControls from 'camera-controls'

import { useStore } from '@/state/store'
import { chipSpec } from '@/data/chip-spec'
import { findBlockSpec } from '@/util/findBlock'
import { getMesh } from '@/scene/meshRegistry'
import { DRILL_GAP, CHILD_HEIGHT } from '@/scene/Block'

/**
 * Canonical viewing angle = near-top-down (~75° elevation).
 *
 * Per user direction (2026-05-18): text/PMU counter labels on each block must
 * be horizontally readable. A flat side-isometric view (the original 30°) makes
 * top-face text impossible to read once we zoom in to small blocks. 75° keeps
 * each block's top face nearly perpendicular to the camera AND preserves
 * enough tilt to perceive Y-stacking between drill layers (parent below /
 * children above).
 *
 * 90° would be pure orthographic blueprint mode — readable but loses depth cue.
 * Tweak `CANONICAL_ELEV_DEG` to bias more flat (lower) or more top (higher).
 */
// User-locked canonical angle (2026-05-18):
//   AZIM = 0° — CPU head points exactly North, tail exactly South on screen
//   ELEV = 72° — near-top-down but tilted enough to show 3D chiplet edges
const CANONICAL_ELEV_DEG = 72
const CANONICAL_AZIM_DEG = 0
const CANONICAL_ELEV = (CANONICAL_ELEV_DEG * Math.PI) / 180
const CANONICAL_AZIM = (CANONICAL_AZIM_DEG * Math.PI) / 180

// L0 default view — chip is portrait (12×18) so we pull camera back more than
// landscape would require, keeping ~40% breathing room top/bottom (matches
// user reference image #2 framing).
const L0_DISTANCE = 36
const L0_LOOK_AT: [number, number, number] = [0, 1, 0]
const L0_CAMERA_POS: [number, number, number] = [
  L0_LOOK_AT[0] + L0_DISTANCE * Math.cos(CANONICAL_ELEV) * Math.sin(CANONICAL_AZIM),
  L0_LOOK_AT[1] + L0_DISTANCE * Math.sin(CANONICAL_ELEV),
  L0_LOOK_AT[2] + L0_DISTANCE * Math.cos(CANONICAL_ELEV) * Math.cos(CANONICAL_AZIM),
]

const _box = new THREE.Box3() // hoisted to avoid allocations on focus change

export function useChoreographer(controlsRef: RefObject<CameraControls | null>) {
  const focusPath = useStore((s) => s.focusPath)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    // L0 ground state — reset to default isometric view
    if (focusPath.length === 0) {
      controls.setLookAt(
        L0_CAMERA_POS[0], L0_CAMERA_POS[1], L0_CAMERA_POS[2],
        L0_LOOK_AT[0], L0_LOOK_AT[1], L0_LOOK_AT[2],
        true, // enableTransition
      )
      return
    }

    const targetId = focusPath[focusPath.length - 1]
    const targetMesh = getMesh(targetId)
    if (!targetMesh) {
      // Mesh not yet registered (mount race) — bail; next focus change retries
      return
    }

    // Custom orbit framing — fitToBox flattens the camera angle when the box
    // is wide+shallow (which every layer is). We compute a fixed isometric
    // 30°-elevation / 45°-azimuth view centered on the new layer instead.
    _box.setFromObject(targetMesh)
    const focusedSpec = findBlockSpec(chipSpec, focusPath)
    const hasChildren = !!focusedSpec?.children?.length

    // Center the camera on the NEW layer (above the focused chiplet) if drillable,
    // or on the focused chiplet itself if it's a leaf.
    const cx = (_box.min.x + _box.max.x) / 2
    const cz = (_box.min.z + _box.max.z) / 2
    const cy = hasChildren
      ? _box.max.y + DRILL_GAP / 2 + CHILD_HEIGHT
      : (_box.min.y + _box.max.y) / 2

    // Distance scales with the bigger of width/depth of the focused mesh.
    // Larger multiplier at near-top-down so the layer fits comfortably in view.
    const sizeXZ = Math.max(_box.max.x - _box.min.x, _box.max.z - _box.min.z)
    const distance = Math.max(8, sizeXZ * 1.6)

    // Canonical near-top-down angle preserved at every drill depth.
    const camX = cx + distance * Math.cos(CANONICAL_ELEV) * Math.sin(CANONICAL_AZIM)
    const camY = cy + distance * Math.sin(CANONICAL_ELEV)
    const camZ = cz + distance * Math.cos(CANONICAL_ELEV) * Math.cos(CANONICAL_AZIM)

    controls
      .setLookAt(camX, camY, camZ, cx, cy, cz, true)
      .catch(() => {
        // setLookAt rejects when interrupted by another move — ignore.
      })
  }, [focusPath, controlsRef])
}
