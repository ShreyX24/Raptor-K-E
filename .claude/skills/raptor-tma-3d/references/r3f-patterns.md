# R3F Patterns for raptor-tma

## Canonical scene setup (`src/scene/ChipScene.tsx`)

```tsx
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Environment } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Suspense } from 'react'

<Canvas
  frameloop="demand"
  dpr={[1, 2]}                                          // bump to [1, 3] on the 4090
  shadows
  gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
  camera={{ position: [8, 12, 14], fov: 35, near: 0.1, far: 100 }}
  onCreated={({ gl }) => {
    THREE.ColorManagement.enabled = true
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.toneMapping = THREE.AgXToneMapping
    gl.toneMappingExposure = 1.0
  }}
>
  <color attach="background" args={['#0a1628']} />
  <fog attach="fog" args={['#0a1628', 25, 60]} />
  <Lighting />
  <EnvironmentSetup />
  <Suspense fallback={<LoadingBar />}>
    <ChipRoot spec={chipSpec} />
  </Suspense>
  <CameraControls ref={controlsRef} makeDefault smoothTime={0.6} />
  <PostFX />
  {import.meta.env.DEV && <Perf position="bottom-left" />}
</Canvas>
```

Note: `antialias={false}` because SMAA in the post-FX chain handles it; native MSAA would double-pass.

## On-demand rendering

`frameloop="demand"` + `invalidate()` means the scene renders only when something changes. Call `invalidate()`:
- From tween steps (inside `useFrame` while animating)
- From Zustand subscribers when severity / focus / hover changes
- **Never** from `setInterval` (that would force constant rendering — defeats the purpose)

Idle scene = 0 fps = 0% GPU. R3F docs explicitly recommend this for scenes with rest states.

## Instancing — the perf cliff

Drop drei `<Instances>` for raw `THREE.InstancedMesh` **above ~100 instances per type** (drei issues #1154, #2041 document ~10 fps at 1000 instances).

Raw imperative pattern, attached via `<primitive>`:
```tsx
function PortGrid({ count, geometry, material }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      dummy.position.set(i % 8, 0, Math.floor(i / 8))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count])
  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}
```

For >500 instances, save 5–10 ms/frame by constructing imperatively in `useEffect` and attaching via `<primitive object={instMesh} />`.

For Lion Cove specifically: 18 execution ports → fine for drei `<Instances>` (well under 100). 64 GPU EUs → also fine.

## LOD

drei `<Detailed>` with 3 geometries at distances 0 / 6 / 20:
```tsx
<Detailed distances={[0, 6, 20]}>
  <mesh geometry={highPoly} />
  <mesh geometry={midPoly} />
  <mesh geometry={lowPoly} />
</Detailed>
```

Frustum culling is automatic for individual meshes; combine with manual `frustum.intersectsBox()` for instanced meshes (three.js doesn't auto-cull individual instances).

## No per-frame allocations (biggest R3F killer)

```tsx
// ❌ allocates Vector3 every frame
useFrame(() => {
  mesh.position.add(new THREE.Vector3(0.01, 0, 0))
})

// ✅ hoist to module scope or useMemo
const TICK_VELOCITY = new THREE.Vector3(0.01, 0, 0)
useFrame(() => {
  mesh.position.add(TICK_VELOCITY)
})
```

Same rule for `THREE.Color`, `THREE.Matrix4`, `THREE.Quaternion`.

## React Strict Mode

Strict Mode double-invokes effects → double-allocates GPU resources. Either:
1. Disable Strict Mode for the `<Canvas>` subtree, OR
2. Use `useLayoutEffect` cleanup to `.dispose()` geometries, materials, textures, render-targets explicitly.

Example cleanup:
```tsx
useLayoutEffect(() => {
  const geo = new THREE.BoxGeometry(1, 1, 1)
  return () => geo.dispose()
}, [])
```

## Pointer events

R3F's built-in raycasting handles ~1000 meshes. Beyond that, set `raycast={meshBounds}` on leaves for bounding-sphere fallback (drei provides this).

Hover handlers should bump emissive intensity via `useFrame` lerp (not React state) — selective bloom does the rest.

## State binding (Zustand) — never re-render the scene

```tsx
// ❌ subscribes to whole store; re-renders on any change
const store = useStore()

// ✅ selector — re-renders only when this slice changes
const finding = useStore((s) => s.findings[id])

// ✅ for read-only access in useFrame, prefer getState() (no subscription at all)
useFrame(() => {
  const f = useStore.getState().findings[id]
  // ...
})
```

## Anti-patterns to refuse

- `OrbitControls` (no smoothing, no `fitToBox` — use drei `<CameraControls>`)
- `new THREE.Vector3()` inside `useFrame` (GC thrash; hoist)
- `setState` inside `useFrame` (infinite render loop)
- Mounting/unmounting meshes on focus change (animate opacity + `visible={false}` instead)
- `material.color = ...` via React prop in hot path (lerp via ref in `useFrame`)
- `<Html>` without `transform` prop (renders at wrong scale)
- Missing `outputColorSpace = SRGBColorSpace` (milky materials)
- `Bloom luminanceThreshold={0}` (everything glows — use ≥1.0; see `postprocessing.md`)
- `<Suspense>` per block (hiccup at every drill — suspend only at the chip-housing GLB)
- `MeshBasicMaterial` everywhere (no PBR response, flat scene)
- `dispose()` skipped (WebGL leaks compound; minutes of clicking = hundreds of MB GPU memory)

## Profiling toolkit

- **r3f-perf** (`<Perf />`) — draw calls, triangles, GPU memory, fps. Dev only; gate behind `import.meta.env.DEV`.
- **Spector.js** Chrome extension — capture a frame, inspect every GL command. Indispensable for shader debugging.
- **stats-gl** (Utsubo) — works with both WebGL2 and WebGPU.
- **Chrome DevTools Performance tab** — long-tasks view shows GC pauses and React reconcile hot paths.

## When to drop to imperative three.js

If r3f-perf shows >5 ms/frame in the reconciler (Chrome DevTools Performance), and the cause is per-instance children, write a `useEffect` that constructs `THREE.InstancedMesh` imperatively, sets matrices in a single loop, attaches via `<primitive object={instMesh} />`. R3F per-instance reconciler is fine up to ~100; beyond that, imperative saves 5–10 ms/frame.
