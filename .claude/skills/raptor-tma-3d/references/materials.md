# Materials for raptor-tma

Four paste-ready PBR recipes. All play correctly with the `postprocessing.md` chain (AgX tone mapping + selective bloom at `luminanceThreshold=1.0`).

## 1. Glowing edge (focused-block rim)

```tsx
<meshStandardMaterial
  color="#0a1628"
  emissive="#00b2ff"
  emissiveIntensity={2.4}
  metalness={0.6}
  roughness={0.35}
/>
```

`emissiveIntensity > 1` is what causes selective Bloom to pick this up — sibling blocks with intensity 1.0 stay dim.

## 2. Glass / acrylic chip housing

```tsx
<MeshTransmissionMaterial
  thickness={0.6}
  roughness={0.06}
  transmission={1}
  ior={1.45}
  chromaticAberration={0.04}
  backside
  distortion={0.05}
  attenuationColor="#88c5ff"
  attenuationDistance={2.5}
  color="#e8f6ff"
/>
```

Used for the outer chip-housing shell (the only optional GLB asset). Heavy — apply to one mesh only.

## 3. Dark anodized aluminum (inner blocks — L1+ core/cluster/sub-block bodies)

```tsx
<meshPhysicalMaterial
  color="#1a1d24"
  metalness={0.85}
  roughness={0.42}
  clearcoat={0.4}
  clearcoatRoughness={0.6}
  envMapIntensity={1.1}
/>
```

**Phase 2 correction:** the MD originally listed this as the L0 plate default, but the reference images (Intel Architecture Day page 2) show L0 plates as translucent blue glass, not opaque anodized aluminum. Anodized is for the **inner blocks** revealed by drill-down (Phase 3+).

For the L0 tile plates, use this cheaper-than-MeshTransmissionMaterial recipe (verified Phase 2 at 60 fps, all 4 plates):

```tsx
{/* L0 tile plate — translucent blue glass illusion via emissive + clearcoat, NOT transmission */}
<meshPhysicalMaterial
  color="#1a2538"
  metalness={0.4}
  roughness={0.3}
  clearcoat={0.6}
  clearcoatRoughness={0.35}
  emissive="#0a3a55"
  emissiveIntensity={0.4}
  envMapIntensity={1.3}
  transparent
  opacity={1}
/>
```

**Why not `transmission`?** MeshPhysicalMaterial with `transmission > 0` on 4 plates drops to 1–4 fps (verified). Full `MeshTransmissionMaterial` is worse. Use the emissive+clearcoat trick above to get the "illuminated glass" look without the perf cost. Reserve true transmission for the optional outer chip housing (one mesh max).

## 4. Brushed metal (interconnect / bus surfaces)

```tsx
<meshPhysicalMaterial
  color="#3a3f48"
  metalness={1.0}
  roughness={0.55}
  anisotropy={0.85}
  anisotropyRotation={Math.PI / 2}
/>
```

Use for the L3 ring overlay, fabric bands, IMC bus, PCIe lanes.

## "Light leaking from inside" effect

Wrap each block in drei `<Edges>` with an emissive material, place a small point light at the block centroid, let selective Bloom finish it:

```tsx
<mesh ref={meshRef}>
  <boxGeometry args={[w, h, d]} />
  {/* anodized aluminum from recipe 3 */}
  <meshPhysicalMaterial color="#1a1d24" metalness={0.85} roughness={0.42}
                        clearcoat={0.4} clearcoatRoughness={0.6} />
</mesh>
<Edges color="#00b2ff" threshold={20} />
<pointLight position={[0, 0, 0]} intensity={4} color="#00b2ff" distance={1.5} />
```

This is the L0 plate look — cyan glow emanating from beneath each tile.

## Severity-driven emissive (the binding pattern)

**Mutate via ref in `useFrame`. Never** change `material.color` via React prop — triggers shader recompile every render.

```tsx
const severityColors: Record<Severity, THREE.Color> = {
  GREEN:    new THREE.Color('#00b2ff'),
  YELLOW:   new THREE.Color('#ffcc33'),
  RED:      new THREE.Color('#ff5566'),
  CRITICAL: new THREE.Color('#ff2233'),
}
const severityIntensity: Record<Severity, number> = {
  GREEN: 1.0, YELLOW: 2.0, RED: 4.0, CRITICAL: 8.0,
}

function Block({ id }: { id: BlockId }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const finding = useStore((s) => s.findings[id])
  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    const sev = finding?.severity ?? 'GREEN'
    mat.emissive.lerp(severityColors[sev], 0.08)
    const target = severityIntensity[sev]
    const pulse =
      sev === 'CRITICAL'
        ? 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 6)
        : 1
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      target * pulse,
      0.1
    )
  })
  return <mesh ref={meshRef} /* geometry + material */ />
}
```

Rules:
- Pulse only on CRITICAL (~6 rad/s)
- YELLOW/RED are static-elevated (no pulse)
- Severity color lerps over ~12 frames (factor 0.08 = ~12-frame settle)
- The `THREE.Color` and `THREE.MathUtils.lerp` calls do not allocate per frame (lerp mutates in place)

## Hover bump

When pointer hovers a mesh, bump `emissiveIntensity` from base × 1.0 to base × 1.8 over ~200 ms. Selective bloom does the rest.

```tsx
const [hovered, setHovered] = useState(false)
useFrame(() => {
  const target = hovered ? base * 1.8 : base
  mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.12)
})
return <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} />
```

(Note: `setHovered` inside event handlers is fine — those don't run at 60 Hz like `useFrame` does.)

## Material reuse

Materials are expensive to create. Create once at module scope or via `useMemo`, share across instances when possible:

```tsx
const ANODIZED = new THREE.MeshPhysicalMaterial({
  color: '#1a1d24', metalness: 0.85, roughness: 0.42,
  clearcoat: 0.4, clearcoatRoughness: 0.6, envMapIntensity: 1.1,
})
// ...
<mesh material={ANODIZED} />
```

But: if you're mutating emissive per-mesh (severity binding), each mesh needs its own material instance. Clone before assigning: `material={ANODIZED.clone()}`.
