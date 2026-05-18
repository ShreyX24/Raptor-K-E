# Camera Choreography for raptor-tma

## Tool

drei `<CameraControls>` (wraps Yomotsu `camera-controls` v3.1.2). **Never** `OrbitControls`.

```tsx
<CameraControls ref={controlsRef} makeDefault smoothTime={0.6} />
```

Key feature: `await cameraControls.fitToBox(targetMesh, true)` returns a Promise that resolves when the move ends. Chain transitions via `await`.

## `useChoreographer` hook (src/camera/Choreographer.ts)

Subscribes to `focusPath` in Zustand. On change:

1. Compute box3 of target block (walk children to include their bounds).
2. `await controls.fitToBox(box, true, { paddingTop: 0.2, paddingBottom: 0.2, paddingLeft: 0.4 })` — cubic-out tween.
3. In parallel: tween siblings opacity 1 → 0.08 over 600 ms.
4. In parallel: stagger-reveal children scale 0.9 → 1.0 with 30 ms stagger.
5. Update breadcrumb store (already in Zustand).
6. On Esc: `focusPath.pop()`; reverse.

Use `controls.smoothTime = 0.6` and the `onRest` event for post-arrival work. **Never use `setTimeout`** for camera arrival — it doesn't respect actual timing.

```tsx
// pseudo-implementation
function useChoreographer(controlsRef, sceneApi) {
  const focusPath = useStore((s) => s.focusPath)
  useEffect(() => {
    if (!controlsRef.current) return
    const targetMesh = sceneApi.findMeshByPath(focusPath)
    if (!targetMesh) return
    const box = new THREE.Box3().setFromObject(targetMesh)
    controlsRef.current
      .fitToBox(box, true, { paddingTop: 0.2, paddingBottom: 0.2, paddingLeft: 0.4 })
    sceneApi.fadeSiblings(focusPath, 0.08)
    sceneApi.staggerReveal(focusPath, { from: 0.9, to: 1.0, stagger: 30 })
  }, [focusPath])
}
```

## Sibling fade, not destroy

Always animate opacity, **never** unmount. Mount/unmount on focus causes 200–500 ms stutters per click and destroys spatial memory.

```tsx
// Set transparent once at material creation
const material = new THREE.MeshPhysicalMaterial({ /* ... */ transparent: true })

// Per-block opacity ref + lerp in useFrame
const targetOpacity = useRef(1)
useFrame(() => {
  const current = meshRef.current.material.opacity
  meshRef.current.material.opacity = THREE.MathUtils.lerp(current, targetOpacity.current, 0.06)
})
```

When entering a deeper focus, set `targetOpacity.current = 0.08` for siblings; restore to 1.0 on exit.

## Parent shells as wireframe ghosts

When drilling in, parent layers stay visible as `<Edges>` at low opacity so spatial context survives:

```tsx
<group visible={isAncestor(focusPath, blockId)}>
  <Edges color="#00b2ff" opacity={0.15} threshold={20} transparent />
</group>
```

This is the difference between "I'm lost at level 4" and "I can see where I came from."

## Frame-by-frame (example: L0 Top → L1 Front End → L2 Decode → L3 Lane 3)

**L0 → L1 (click "Front End" inside a P-core):**
- t=0: `focusPath = ['compute', 'p-core-0', 'frontend']`; siblings fade to 0.08 over 600 ms
- t=0–800: `fitToBox(frontendBox)` cubic-out, camera at ~30° elevation
- t=400: sub-blocks scale 0.9 → 1.0 with 30 ms stagger between siblings
- t=800: HUD FindingsPanel slides in from right with rules-engine narrative

**L1 → L2 (click "Decode"):**
- t=0: `focusPath.push('decode')`; other front-end sub-blocks fade to 0.08
- t=0–700: `fitToBox(decodeBox)` + 0.3 rad `rotateAzimuth` (slight orbit reveals 8 lanes)
- t=300: 8 decode lanes explode outward via `useFrame` lerp from stacked to fan, 600 ms `easeOutBack`
- t=700: breadcrumb updates

**L2 → L3 (click "Lane 3"):**
- t=0: `focusPath.push('lane-3')`; lanes 0,1,2,4,5,6,7 fade to 0.08; lane 3 emissive pulse
- t=0–600: very close dolly, camera ~1.5 units from lane 3
- t=300: lane 3 expands internal sub-meshes (instruction queue slot, length-decode unit, µop emitter)
- t=600: narrative updates; cycle-level telemetry overlays via `<Html transform>` floating next to lane 3

## Keyboard

- **Esc**: `focusPath.pop()`, reverse the move
- **Arrows**: rotate at current level (`rotateAzimuth` ±0.3 rad)
- **B**: toggle top-down blueprint mode (camera reset to `[0, 18, 0.01]`, looking down)
- **Tab / Shift-Tab**: walk siblings at current depth (a11y — see below)
- **Enter**: drill in (same as click)

## Picture-in-picture mini-map

Top-right corner, **200×200 px ortho overview** of the whole die with a focus marker rectangle. Updates on `focusPath` change. Render as a second small `<Canvas>` (or `useFrame`-driven offscreen canvas → 2D drawn into an `<img>`).

## Accessibility — keyboard nav for 3D

Maintain a `focusableTree` in Zustand mirroring `chipSpec`. Bind:
- **Tab / Shift-Tab**: walk siblings at current depth
- **Enter**: drill in
- **Esc**: pop

Render an invisible DOM equivalent (`<button>` per mesh) absolute-positioned to projected screen coords. Screen readers get a real tree.

```tsx
function A11yMirror() {
  const focusableTree = useStore((s) => s.focusableTree)
  return (
    <div className="sr-only">
      {flatten(focusableTree).map((b) => (
        <button
          key={b.id}
          onFocus={() => useStore.getState().focus(b.path)}
          aria-label={b.label}
        />
      ))}
    </div>
  )
}
```

## Picking

R3F's pointer events handle ~1000 meshes via built-in raycasting. Beyond that, set `raycast={meshBounds}` on leaves for bounding-sphere fallback (drei provides this).

## When to use Theatre.js

**ONLY for the intro cinematic** (first-load reveal of the whole die). Theatre is keyframed and great for that.

**Never for drill-down** — drill-down is data-driven (target box computed from spec at runtime), Theatre is keyframed-at-author-time. They don't compose.

Theatre.js Studio must NOT ship in production — gate via `import.meta.env.DEV`.

## Anti-patterns

- `OrbitControls` (no fitToBox, no smoothing)
- `setTimeout` for camera arrival (use `onRest` event or `await fitToBox`)
- Mounting/unmounting siblings on focus (use opacity + `visible={false}`)
- Calling `setState` from `useFrame` during a tween (infinite loop)
- Theatre.js for drill-down (keyframed vs data-driven mismatch)
- Forgetting to update breadcrumb on focus change (user gets lost)
- Animating opacity without `material.transparent = true` (no visible effect)
