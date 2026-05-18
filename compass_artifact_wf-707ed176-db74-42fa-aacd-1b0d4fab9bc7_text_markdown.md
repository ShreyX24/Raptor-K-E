# ASTRA-TMA Frontend: Cinematic Exploded-Isometric 3D Stack — Decision Report

## TL;DR
- **Build it on React Three Fiber 9 + drei 10 + @react-three/postprocessing 3 on a WebGL2 renderer today, with a WebGPU upgrade path; pair with Zustand, Tailwind v4 + shadcn/ui, and Yomotsu's `camera-controls` (via drei) for choreographed camera moves.** Procedurally generate the chip from a TypeScript taxonomy spec — do not author it in Blender first.
- **The single highest-leverage Claude Code lever is a custom Agent Skill.** Author one cohesive skill (`astra-tma-3d`) following Anthropic's `skill-creator` house style (one `SKILL.md` under 500 lines + `references/` per domain + `scripts/` for boilerplate), and install CloudAI-X's `threejs-skills` plus Anthropic's `frontend-design` as companions. The complete skill spec and copy-pasteable build prompt are below.
- **Biggest risks are perf cliffs and over-engineering.** With ~500 interactive meshes you need instancing, KTX2 textures, on-demand rendering, and frustum-aware LOD from day one — not as an optimization pass. The build prompt in §9 is engineered to make Claude Code produce this correctly the first time.

---

## Key Findings

1. **R3F v9 is the only React-native option** with the abstractions you need (CameraControls, Instances, Html, Environment, MeshTransmissionMaterial) and the largest Claude Code training corpus.
2. **Ship WebGL2 in 2026 even though WebGPU is Baseline.** The WebGL2 post-processing ecosystem (especially N8AO) is currently better, and Intel iGPU/driver issues on WebGPU still exist as of early 2026.
3. **AgX is the correct tone mapping default** for your cinematic look (ACES desaturates highlights; Khronos PBR Neutral is for e-commerce).
4. **Procedural geometry beats Blender authoring by ~5×** in time-to-v1 for your well-defined taxonomy. AI-generated 3D is still unusable for engineered hard-surface geometry in 2026.
5. **Anthropic's `frontend-design` skill explicitly does not cover any 3D/Three.js/R3F content** (verified) — leaving a clear niche for a custom skill.
6. **One cohesive skill with `references/` per domain** beats CloudAI-X's "10 sibling skills" pattern for a single-developer, single-project workflow, per Anthropic's own skill-creator guidance.
7. **The biggest perf trap is `backdrop-filter: blur(20px)` over the canvas** — it re-rasterizes the WebGL canvas every paint, killing fps on Intel iGPUs.

---

## Section 1 — The 3D Rendering Stack (Pick: R3F 9 on WebGL2, WebGPU-ready)

### Verdict
**Winner: React Three Fiber (R3F) v9 + drei v10 + @react-three/postprocessing v3 on a WebGL2 `WebGLRenderer`, with a planned migration to `WebGPURenderer` once your scene is stable.**

### Why this wins
1. **You want React + Tailwind + shadcn chrome.** R3F is the only mature option that lets the 3D scene live as JSX inside the same component tree as your HUD. Threlte 8 is excellent but Svelte-only. Raw Three.js with a thin React wrapper means reinventing every drei abstraction (Bounds, Instances, CameraControls, Html, Environment).
2. **6+ levels of recursive drill-down map onto React's component tree natively.** Each domain becomes a `<Domain>`, each sub-block a child. React's reconciler handles mount/unmount as the user zooms; you get conditional rendering, Suspense for lazy-loaded sub-meshes, and Zustand subscriptions to update only the focused subtree.
3. **Claude-Code-friendly.** R3F's JSX-as-Three.js has the most training data of any 3D web paradigm, and CloudAI-X's `threejs-skills` ships SKILL.md files compatible with R3F patterns. Raw imperative Three.js generates 2–3× more lines and Claude Code regresses more often.
4. **The pmndrs ecosystem covers 100% of needs.** drei: `<CameraControls>`, `<Bounds>`, `<Float>`, `<Html>`, `<Instances>`, `<Detailed>` (LOD), `<Environment>`, `<PerformanceMonitor>`, `<MeshTransmissionMaterial>`, `<Edges>`, `<Outlines>`. @react-three/postprocessing wraps the pmndrs `postprocessing` library which merges effects into a single shader pass (faster than three.js's stock `EffectComposer`).

### Exact dependency list (versions current as of May 2026)

```jsonc
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "three": "^0.171.0",                       // r171+ ships production WebGPURenderer
    "@react-three/fiber": "^9.6.1",            // pairs with React 19
    "@react-three/drei": "^10.7.7",
    "@react-three/postprocessing": "^3.0.0",
    "postprocessing": "^6.36.0",
    "n8ao": "^1.9.4",
    "leva": "^0.10.0",
    "zustand": "^5.0.8",
    "@theatre/core": "^0.7.2",
    "@theatre/studio": "^0.7.2",
    "@theatre/r3f": "^0.7.2",
    "three-stdlib": "^2.36.0",
    "maath": "^0.10.8",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "lucide-react": "^0.460.0",
    "framer-motion": "^11.11.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.9.0",
    "@types/three": "^0.171.0",
    "@gltf-transform/cli": "^4.0.0",
    "r3f-perf": "^7.2.0"
  }
}
```

### WebGL2 vs WebGPU in 2026 — what to ship

**Ship WebGL2 first; gate WebGPU behind a feature flag.** WebGPU achieved Baseline in January 2026, finalized when Firefox 147 released January 13 with WebGPU enabled on Windows and ARM64 macOS (per byteiota.com's 2026 WebGPU adoption analysis), and three.js's `WebGPURenderer` has been production-ready since the r171 release in September 2025 with automatic WebGL 2 fallback (per byteiota.com: "Three.js — the dominant web 3D library with 2.7 million weekly npm downloads — has supported WebGPU since release r171, complete with automatic WebGL 2 fallback").

Even so, three concrete reasons to defer WebGPU for v1:
- **Driver/platform gaps on Intel hardware persist.** Chrome WebGPU on Linux for Intel Gen12+ hardware was still rolling out via Chrome 144 Beta in early 2026 (per webgpu.com news coverage of the cross-browser-ship milestone).
- **`@react-three/postprocessing` v3 is mature on WebGL2.** The WebGPU TSL-based post-processing path is newer and has fewer ready-made effects; N8AO is WebGL2-only and is your single best SSAO option.
- **R3F's WebGPU path uses an async `gl={async ...}` factory.** It works, but Claude Code generates the synchronous `gl` form by default; sticking with WebGL2 avoids a class of regressions.

The right strategy: build on WebGL2, write any custom shaders in TSL (`three/tsl`) so they cross-compile to WGSL later, and flip the renderer when Intel Arc driver coverage is fully resolved on your target workstations and you hit a perf wall WebGL2 can't solve.

### Known gotchas
- **R3F v9 + React 19.2**: when React 19.2's reconciler bumped, R3F v9 bundled its own reconciler to remain compatible across React 19.0–19.2 (per pmndrs/react-three-fiber release notes). Slightly larger bundle, no API impact.
- **React Strict Mode** double-invokes effects → double-allocates GPU resources. Use rigorous `useLayoutEffect` cleanup with `.dispose()` on geometries/materials/textures.
- **drei `<Instances>` has a known perf cliff vs raw `THREE.InstancedMesh`** (drei issues #1154 and #2041 document this; users report ~10 fps when scaling drei `<Instances>` to 1000 boxes versus smooth performance with raw `InstancedMesh`). Drop to raw `<instancedMesh>` once you exceed ~100 instances of a type.
- **Selective bloom requires `luminanceThreshold ≥ 1.0`** and emissive intensities > 1. Per the @react-three/postprocessing Bloom docs: "Bloom is selective by default, you control it not on the effect pass but on the materials by lifting their colors out of 0-1 range. a luminanceThreshold of 1 ensures that ootb nothing will glow, only the materials you pick."
- **Color management**: set `THREE.ColorManagement.enabled = true`, renderer `outputColorSpace = SRGBColorSpace`.

### Newer entrants evaluated and rejected
- **Polygonjs / Hubris / dgrt**: small communities, no Claude Code training data.
- **Babylon.js (WebGPU-first since 5.0)**: technically excellent, but React integration is weaker than R3F.
- **@react-three/uikit**: WebGL-rendered UI inside the canvas — interesting for in-scene HUDs but adds learning surface for a single dev. Use drei `<Html>` instead.

---

## Section 2 — Post-Processing & Cinematic Look

### Stack: pmndrs `postprocessing` (via `@react-three/postprocessing`) + N8AO

The pmndrs library merges compatible effects into a single fragment shader, which is faster than three.js's stock `EffectComposer` for the typical 4–6 effect stack. `realism-effects` adds SSR + SSGI; skip it — too heavy for a chip scene without reflective floors.

### Exact "Intel Architecture Day slide" effect chain

```tsx
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping,
         ChromaticAberration, BrightnessContrast, HueSaturation, SMAA, N8AO } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

<EffectComposer multisampling={0} enableNormalPass>
  <N8AO aoRadius={0.6} distanceFalloff={0.4} intensity={3} screenSpaceRadius color="#000814" quality="high" />
  <Bloom mipmapBlur intensity={1.4} luminanceThreshold={1.0} luminanceSmoothing={0.4} radius={0.85} levels={7} />
  <DepthOfField focusDistance={0} focalLength={0.04} bokehScale={3} height={720} />
  <ChromaticAberration offset={[0.0006, 0.0006]} radialModulation modulationOffset={0.5} />
  <HueSaturation saturation={0.08} />
  <BrightnessContrast brightness={-0.02} contrast={0.12} />
  <Vignette eskil={false} offset={0.18} darkness={0.7} />
  <ToneMapping mode={ToneMappingMode.AGX} />
  <SMAA />
</EffectComposer>
```

### Tone mapping: AgX over ACES over Khronos PBR Neutral
- **ACES** desaturates highlights aggressively; per the Khronos PBR Neutral release notes ("Khronos PBR Neutral Tone Mapper Released for True-to-Life Color Rendering of 3D Products"), ACES inherits assumptions from film with wider-than-sRGB inputs, so "canary yellow, bright greens and blues are all impossible to output to the screen" — your cyan glow will turn white.
- **Khronos PBR Neutral** preserves base color brilliantly but is built for e-commerce product viewing under neutral lighting — wrong vibe.
- **AgX has been Blender's default since Blender 4.0** (per Blender's 4.0 color-management release notes: "The AgX view transform has been added, and replaces Filmic as the default in new files"), and is available in three.js as `AgXToneMapping` / `agxToneMapping` in TSL. Filmic roll-off without ACES's hue skew — right cinematic default.

### HDR environment / IBL strategy

Use drei `<Environment>` with a Poly Haven studio HDRI (CC0):

```tsx
<Environment files="/hdri/studio_small_09_2k.hdr" environmentIntensity={0.4} background={false} />
{/* Hero key light — warm, top-down */}
<directionalLight position={[6, 10, 4]} intensity={2.2} color="#fff4e0" castShadow />
{/* Rim light — the Intel Arc cyan glow from below-back */}
<pointLight position={[0, -2, -4]} intensity={8} color="#00b2ff" distance={12} decay={1.6} />
{/* Cool fill from left */}
<pointLight position={[-6, 2, 2]} intensity={2.5} color="#4dd0ff" distance={20} decay={2} />
```

Resolution rule of thumb: 1k–2k for a closed scene like this; 4k is wasted on a chip that fills the frame. Store as `.hdr` and let three.js's `PMREMGenerator` compute the IBL convolution at startup (drei's `<Environment>` does this automatically). Per drei's `<Environment>` docs, props like `environmentIntensity` and `backgroundRotation` are supported on three 0.163+.

### Material recipes (paste-ready)

**Glowing edge (the layered chip rim):**
```tsx
<meshStandardMaterial color="#0a1628" emissive="#00b2ff" emissiveIntensity={2.4} metalness={0.6} roughness={0.35} />
```

**Glass / acrylic chip housing:**
```tsx
<MeshTransmissionMaterial thickness={0.6} roughness={0.06} transmission={1} ior={1.45}
  chromaticAberration={0.04} backside distortion={0.05}
  attenuationColor="#88c5ff" attenuationDistance={2.5} color="#e8f6ff" />
```

**Dark anodized aluminum (block bodies):**
```tsx
<meshPhysicalMaterial color="#1a1d24" metalness={0.85} roughness={0.42}
  clearcoat={0.4} clearcoatRoughness={0.6} envMapIntensity={1.1} />
```

**Brushed metal (interconnect / bus surfaces):**
```tsx
<meshPhysicalMaterial color="#3a3f48" metalness={1.0} roughness={0.55}
  anisotropy={0.85} anisotropyRotation={Math.PI / 2} />
```

**"Light leaking from inside" effect**: wrap each block in drei `<Edges>` with an emissive material, place a small `<pointLight intensity={4} color="#00b2ff" distance={1.5}>` at the block centroid, and let selective Bloom do the rest.

**Pulsing edge animation (severity-driven):**
```tsx
useFrame((state) => {
  if (!meshRef.current) return
  const t = state.clock.elapsedTime
  const base = severityToIntensity(severity) // 1.0 / 2.0 / 4.0 / 8.0
  const pulse = severity === 'CRITICAL' ? Math.sin(t * 6) * 0.5 + 0.5 : 1
  ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = base * pulse
})
```

---

## Section 3 — Asset Pipeline (Recommend: Procedural-first, Blender fallback)

**Build the chip procedurally from a TypeScript taxonomy spec.** Use Blender only for ornamental details (logo, decorative housing bevels).

**Why procedural wins:**
1. Your taxonomy is already a tree — emit geometry from it.
2. 200-line TS spec generates the whole chip in minutes vs. weeks of Blender authoring.
3. Data binding is trivial — each generated mesh carries `ruleId` and `domain` as props.
4. Taxonomy edits propagate automatically; no Blender re-export needed.
5. Natural instancing — 32 ports = one geometry, 32 instance matrices.

**Pattern:**
```ts
// chip-spec.ts — single source of truth
export const chipSpec = {
  id: 'lion-cove-p-core',
  layers: [
    { id: 'frontend', label: 'Front End', y: 4.0, blocks: [
        { id: 'bpu',      label: 'Branch Predictor (8× wider)', w: 2, d: 1.5 },
        { id: 'fetch',    label: 'Fetch (64 B/cyc)',            w: 2, d: 1.5 },
        { id: 'decode',   label: 'Decode (8-wide)',             w: 3, d: 1.5, children: [
            { id: 'dec-0', label: 'Lane 0' }, /* ... lanes 1–7 */
        ]},
        { id: 'uop-cache', label: 'µop Cache (5.25K)',          w: 2, d: 1.5 },
        { id: 'uop-queue', label: 'µop Queue (192)',            w: 2, d: 1.5 },
    ]},
    { id: 'ooo',    label: 'Out-of-Order Engine (576-entry ROB)', y: 2.5, blocks: [/* split int/vec schedulers */] },
    { id: 'exec',   label: 'Execution Ports (18 wide)',          y: 1.0, blocks: [/* ALU/AGU/STD/JMP tiles */] },
    { id: 'memory', label: 'Memory Subsystem (L0D 48K / L1D 192K / L2 3M)', y: -0.5, blocks: [/* ... */] },
  ]
}
```

Lion Cove specifics worth encoding (per the Intel Tech Tour 2024 Lion Cove deck, AnandTech's Lunar Lake deep dive, and Chips and Cheese's preview): 8-wide decode (was 6 in Redwood Cove), 5.25K-entry µop cache (was 4096), 192-entry µop queue (was 144), 18 execution ports (was 12), 576-entry ROB (was 512), split integer + vector schedulers, 48 KB L0D + 192 KB L1D + up to 3 MB L2.

### When to use Blender (the fallback layer)
For the chip housing only — outer glass volume with bevels, etched logo. Author once in Blender, export as `.glb` with Meshopt compression:

```bash
gltf-transform meshopt input.glb output.glb
toktx --bcmp --format BC7_RGBA --genmipmap housing-color.ktx2 housing-color.png
# Or single-shot UASTC via gltf-transform:
gltf-transform uastc input.glb output.glb --level 4
```

**Meshopt > Draco for your case.** Per the glTF-Transform `EXT_meshopt_compression` docs and the Khronos 3D-Formats-Guidelines, "Meshopt decoding is considerably faster than Draco decoding," because Meshopt uses a lightweight decoder optimized for runtime decompression. Draco wins only on download size for very high-poly assets — not your scenario, and Meshopt plays nicely with instancing.

Loader plumbing in R3F:
```tsx
const gltf = useGLTF('/chip-housing.glb', true, false, (loader) => {
  loader.setKTX2Loader(ktx2Loader.detectSupport(gl))
  loader.setMeshoptDecoder(MeshoptDecoder)
})
```

### AI-generated 3D verdict (Meshy / Luma Genie / TripoSR / Stable3D)
**Not usable for engineered hard-surface CPU geometry in 2026.** Output topology is messy, UVs are unusable for KTX2 baking, no concept of "32 identical execution ports." Skip them.

### Time estimates for v1 (single dev with Claude Code)
| Path | Time to v1 | Risk |
|---|---|---|
| **Pure procedural (recommended)** | **3–5 days** | Low |
| Hybrid (procedural blocks + Blender housing) | **5–7 days** | Low |
| Full Blender authoring | 3–4 weeks | High |
| AI-generated 3D | Don't | High |

---

## Section 4 — Navigation & Camera Choreography

### Recommendation: **drei `<CameraControls>` + a custom `useChoreographer` hook built on `fitToBox()` Promises. Theatre.js for pre-baked cinematic intros only.**

drei wraps Yomotsu's `camera-controls` library (currently v3.1.2). Its key feature for your use case is async `await cameraControls.fitToBox(targetMesh, true)` — returns a Promise that resolves when the move ends, and supports chained transitions per the camera-controls docs ("complex transitions with await"). Theatre.js is brilliant for *keyframed* cinematic sequences but the wrong tool for data-driven, interactive camera targets.

### 6-level scalability — "Matryoshka with breadcrumbs"

The classical failure mode: at level 4, the user is staring at one mesh with no idea where they came from. Solution stack:

1. **Always-visible breadcrumb HUD** (top-left): `Lion Cove › Front End › Decode › Lane 3 › µop 2`. Each crumb clickable.
2. **Sibling fade, not destroy**: animate opacity 1 → 0.08 over 600 ms; do not unmount. Preserves spatial memory.
3. **Parent "shells" stay as wireframe ghosts** (`<Edges>` at low opacity). User sees the chip skeleton even at level 5.
4. **Auto-2D handoff at level 6+**: cache way layouts, register file slots, FU schedulers — inherently 2D. Render as SVG via drei `<Html transform>` attached to the focused mesh.
5. **Picture-in-picture mini-map** (top-right, 200×200 px ortho overview with focus marker).

### Frame-by-frame for the example flow

**User clicks "Front End" from top view (camera at `[8, 12, 14]`):**
- t=0ms: capture click, set `focusPath = ['frontend']`; sibling layers fade-out to 0.08 over 600 ms.
- t=0–800ms: `cameraControls.fitToBox(frontendBox, true, { paddingTop: 0.2, paddingBottom: 0.2 })` — cubic-out tween centering Front End at ~30° elevation.
- t=400ms: Front End sub-blocks animate scale 0.9 → 1.0 with 30 ms stagger between siblings.
- t=800ms: HUD findings panel slides in from right with rules-engine narrative.

**User clicks "Decode Cluster" inside Front End:**
- t=0ms: `focusPath = ['frontend', 'decode']`. Other front-end sub-blocks fade to 0.08.
- t=0–700ms: `fitToBox(decodeBox, true)` plus a 0.3 rad rotateAzimuth — slight orbit so the 8 decode lanes become visible.
- t=300ms: the 8 lane meshes "explode" outward — useFrame-driven lerp from stacked to fan layout, 600 ms with `easeOutBack`.
- t=700ms: breadcrumb updates.

**User clicks "Decoder Lane 3":**
- t=0ms: `focusPath = ['frontend', 'decode', 'lane-3']`. Lanes 0,1,2,4,5,6,7 fade to 0.08; lane 3 emissive pulse.
- t=0–600ms: very close dolly — camera ~1.5 units from lane 3.
- t=300ms: lane 3 expands internal sub-meshes (instruction queue slot, length-decode unit, µop emitter) with same explode pattern.
- t=600ms: narrative panel updates; if rule references cycle-level telemetry, a 2D timing diagram overlays via `<Html transform>` floating next to lane 3.

**Esc handler** pops `focusPath`, reverses the move. **Keyboard arrows** rotate at current level; **B** toggles top-down blueprint mode.

### Picking & interaction
- R3F's pointer events handle ~1000 meshes via built-in raycasting. Beyond that, set `raycast={meshBounds}` on leaves for bounding-sphere fallback (drei provides this).
- Hover: bump `emissiveIntensity` from 1.0 → 1.8 over 200 ms via `useFrame` lerp. Selective bloom does the rest.
- **Accessibility (keyboard nav for 3D)**: maintain a `focusableTree` in Zustand mirroring the spec; bind Tab/Shift-Tab to walk siblings at current depth, Enter drills in, Esc pops. Render an invisible DOM equivalent (`<button>` per mesh) absolute-positioned to projected screen coords — screen readers get a real tree.

### Reference sites worth studying
- **bruno-simon.com**: idle micro-physics. Take the small ambient camera drift (±0.5° azimuth oscillation) when no input.
- **Apple product pages (M-series chip reveals)**: scroll-bound layer separation — the "stacked layers float apart on scroll" effect maps directly onto your aesthetic.
- **GitHub Octoverse 2023/2024 interactives**: instanced particle viz, glassy materials, postprocessing combo.
- **The Pudding's 3D essays**: annotation labels floating in space via `<Html transform occlude>`.
- **Half-Life: Alyx HUD / Death Stranding cargo readouts**: cyan-on-black monospace diagnostic readouts; scan-line on focus effect.
- **fromscout.com**, **prior.co.jp** (Immersive Garden / Bruno Simon's studio): cinematic dolly + procedural geometry product reveal.

---

## Section 5 — Data Binding (Rules Engine → 3D Scene)

### State: **Zustand v5, full stop.**

Zustand wins because: it's pmndrs' own library (max alignment with R3F training data); no Provider needed (so `useFrame` callbacks running 60 Hz can read state without forcing re-renders); selective subscription via selectors (`useStore(s => s.findings[blockId])` re-renders only when that block's finding changes).

### Store shape
```ts
type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL'
interface AstraStore {
  trace: TraceMetadata | null
  findings: Record<string, Finding>
  metrics: Record<string, MetricValues>
  narrative: Record<string, string>
  focusPath: string[]
  hoveredBlockId: string | null
  visibleDepth: number
  setFinding: (id: string, f: Finding) => void
  focus: (path: string[]) => void
  hover: (id: string | null) => void
}
interface Finding { ruleId: string; severity: Severity; metric: number; threshold: number; message: string }
```

### Binding data → materials without re-mounting

**Anti-pattern**: changing material color via React prop. Triggers shader recompile and reconciler diff on every render.

**Correct pattern**: mutate via refs in `useFrame`:

```tsx
function Block({ id, geometry }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const finding = useStore(s => s.findings[id])
  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissive.lerp(severityColors[finding?.severity ?? 'GREEN'], 0.08)
    const targetIntensity = severityIntensity[finding?.severity ?? 'GREEN']
    const pulse = finding?.severity === 'CRITICAL' ? 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 6) : 1
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity * pulse, 0.1)
  })
  return <mesh ref={meshRef} geometry={geometry}>{/* material */}</mesh>
}
```

### HUD overlay strategy

- **Top-bar, side panel, bottom strip, breadcrumb**: regular React DOM positioned absolute over the `<Canvas>`. Tailwind + shadcn. DOM text is sharper, accessible, screen-reader friendly. Right call 95% of the time.
- **Floating annotations attached to blocks** (e.g., "L1 BTB miss rate: 14.2%" pointing at the BPU mesh): drei `<Html transform occlude="blending">`. The `"blending"` occlusion mode makes labels semi-transparent when behind geometry. `distanceFactor={10}` keeps text readable at all zoom levels.

### Label collision avoidance
drei has no built-in collision. Project label world positions to screen space, run O(n²) overlap check at ~30 Hz (not every frame), suppress lower-priority labels. For >30 labels, move to a force-directed layout.

### Animated transitions
- Severity color: `THREE.Color.lerp(target, 0.08)` in `useFrame` (~12-frame settle).
- Pulse rate: `sin(t * rate)` where rate is lerped over time so severity changes ease smoothly.
- Badge indicators: fade in DOM via Framer Motion `<AnimatePresence>`.

---

## Section 6 — Shadcn + Tailwind v4 Chrome

### Stack
- **Tailwind v4** via `@tailwindcss/vite` (no PostCSS config, CSS variables, Oxide engine). Per the official shadcn Vite install guide, Tailwind v4 is now the first-class path.
- **shadcn/ui** with Neutral base color, dark mode default. Init: `npx shadcn@latest init`.
- **Components**: `Sheet` (panels), `Tabs`, `Command` (Cmd-K search palette), `Tooltip`, `HoverCard`, `Slider` (time scrubber), `ScrollArea`, `Badge`, `Separator`, `Resizable`, `Sonner` (toasts).
- **Templates worth forking**: shadcnstore's free admin dashboard, or DashboardPack's Bloomberg-inspired finance dashboard (both have dense data-readout chrome appropriate for a diagnostic console).

### Glass / frosted blur next to a WebGL canvas — the perf trap
**Don't put `backdrop-filter: blur(20px)` on a full-screen panel overlapping the canvas.** The browser re-rasterizes the canvas frame on every paint to feed the blur filter — measurable fps drop on Intel iGPUs. Safe alternatives:
1. **Static-blur (cheap)**: `background: rgba(10, 22, 40, 0.78); border: 1px solid rgba(0, 178, 255, 0.18);` — no `backdrop-filter`. Gives the glass look without re-rasterizing.
2. **Tiny blur (acceptable)**: `backdrop-filter: blur(8px)` only on small surfaces (breadcrumb pill, hover cards).
3. **Compositor blur**: position panels outside the canvas bounding rect — canvas at `inset: 8rem 24rem 6rem 4rem` with chrome surrounding, not overlapping.

### Font stack: **Geist + Geist Mono**
Pair Geist (Vercel, OFL — free, self-hostable) with Geist Mono / JetBrains Mono for code/telemetry readouts.
- Geist is the cleanest modern sans without the Inter overuse problem.
- Geist Mono / JetBrains Mono evoke the developer-tool / EMON-output context.
- Both open-source, self-hostable (Intel-internal compliance friendly).

**Avoid**: Inter (per Anthropic's `frontend-design` skill which explicitly says: *"Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics"*), IBM Plex (IBM brand baggage), Roboto/system fonts (looks unfinished).

### Color tokens (Intel Arc–inspired)
```css
@theme {
  --color-bg:         oklch(0.18 0.02 250);
  --color-bg-elev:    oklch(0.22 0.025 250);
  --color-arc-cyan:   oklch(0.78 0.18 220);
  --color-arc-glow:   oklch(0.88 0.20 220);
  --color-sev-green:  oklch(0.74 0.18 145);
  --color-sev-yellow: oklch(0.82 0.16 95);
  --color-sev-red:    oklch(0.68 0.22 25);
  --color-sev-crit:   oklch(0.62 0.28 10);
  --color-grid:       oklch(0.30 0.02 250 / 0.35);
}
```

---

## Section 7 — Performance Discipline

Mandatory practices, in priority order:

1. **Instancing for repeated geometry.** 32 execution ports, 8 decode lanes, 4 AGUs, 4 STDs, cache way slots — each a single InstancedMesh with `setMatrixAt`. Aim for ≤200 draw calls at depth 0; ≤500 at any depth. Per the R3F docs "Scaling Performance" page: *"Each mesh is a draw call, you should be mindful of how many of these you employ: no more than 1000 as the very maximum, and optimally a few hundred or less."* Drop drei `<Instances>` for raw `THREE.InstancedMesh` above ~100 instances.

2. **On-demand rendering.** `<Canvas frameloop="demand">` + `invalidate()` from data updates and tween steps. Idle scene = 0 fps = 0% GPU. R3F docs explicitly recommend this for scenes with rest states.

3. **LOD with drei `<Detailed>`.** Three GLBs at distances 0 / 6 / 20 units per major mesh. Frustum culling is automatic; combine with manual `frustum.intersectsBox()` for instanced meshes (Three.js doesn't auto-cull individual instances).

4. **KTX2 textures, no PNG/JPEG at scale.** `toktx --bcmp --genmipmap` for color, UASTC for normal maps. 1024² hero meshes, 512² blocks, 256² repeated tiles.

5. **No per-frame allocations.** The biggest R3F perf killer: `new THREE.Vector3()` inside `useFrame`. Hoist into module scope or `useMemo`.

6. **React Strict Mode + R3F gotchas.** Strict Mode double-invokes effects → double-allocates GPU resources. Either disable Strict Mode for the `<Canvas>` subtree, or use `useLayoutEffect` cleanup to `.dispose()` geometries/materials/textures/render-targets.

7. **React Compiler in 2026.** Auto-memoization helps DOM components; for R3F it's neutral to mildly helpful (most R3F perf issues live inside `useFrame`, not re-renders). Enable it via `babel-plugin-react-compiler` Vite plugin; don't depend on it for perf wins.

8. **When to drop to imperative Three.js**: for procedurally generated instanced meshes with >500 instances, write a `useEffect` that constructs `THREE.InstancedMesh` imperatively, sets matrices in a single loop, and attaches via `<primitive object={instMesh} />`. R3F's per-instance reconciler is fine up to ~100; beyond that you save 5–10 ms/frame imperatively.

9. **Profiling toolkit**:
   - **r3f-perf** (`<Perf />`): draw calls, triangles, GPU memory, fps. Dev only.
   - **Spector.js**: Chrome extension. Capture a frame, inspect every GL command. Indispensable for shader debugging.
   - **stats-gl** (Utsubo): works with both WebGL2 and WebGPU.
   - **Chrome DevTools Performance tab**: long-tasks view shows GC pauses and React reconcile hot paths.

---

## Section 8 — The Custom Claude Code Skill (THE deliverable)

### Landscape (May 2026)

**Anthropic Agent Skills** are folders with a `SKILL.md` (YAML frontmatter + Markdown body) that Claude loads dynamically when its description matches the request. Skills launched on October 16, 2025 with the public `anthropics/skills` GitHub repo, per Simon Willison's day-of writeup at simonwillison.net and corroborated by multiple sources documenting the announcement date. They are natively supported in Claude Code via `/plugin` and the `~/.claude/skills/` directory.

**Most relevant existing skills for your project:**

| Skill | Source | Use it for |
|---|---|---|
| `frontend-design` | `anthropics/skills` (official, Apache 2.0) | 2D web UI aesthetics — Tailwind, typography, motion. **Verified to contain zero mentions of Three.js, R3F, WebGL, 3D, GLTF, shaders, or canvas.** Clear gap for 3D. |
| `threejs-fundamentals`, `threejs-materials`, `threejs-lighting`, `threejs-shaders`, `threejs-postprocessing`, `threejs-interaction`, `threejs-geometry`, `threejs-textures`, `threejs-animation`, `threejs-loaders` | `CloudAI-X/threejs-skills` (Jan 2026, MIT) | Three.js API reference + R3F-compatible patterns. ~450 lines each, code-dense, verified against r160+. |
| `skill-creator` | `anthropics/skills` | Use to author and test your custom skill. |
| `superpowers` skills | `obra/superpowers` | TDD, debugging, brainstorming — orthogonal but useful. |

### Skill design decision: **ONE cohesive skill, split internally via `references/`**

Following Anthropic's `skill-creator` house style (verified): *"When a skill supports multiple domains/frameworks, organize by variant: SKILL.md (workflow + selection) + references/ (per-variant docs). Claude reads only the relevant reference file."* The skill-creator also mandates: *"Keep SKILL.md under 500 lines; if you're approaching this limit, add an additional layer of hierarchy."*

This pattern beats CloudAI-X's "10 sibling skills" approach for a single-developer, single-project case: one trigger to remember, one bundle to maintain, references load only when needed.

### File layout

```
.claude/skills/astra-tma-3d/
├── SKILL.md
├── references/
│   ├── r3f-patterns.md          ← Scene setup, instancing, on-demand rendering, anti-patterns
│   ├── materials.md             ← PBR recipes (glow, glass, metal, anodized)
│   ├── postprocessing.md        ← Exact effect chain + tuning
│   ├── choreography.md          ← Camera move stubs, fitToBox, sibling fade
│   ├── data-contract.md         ← Rules-engine JSON schema + Zustand binding
│   ├── chip-taxonomy.md         ← Lion Cove block hierarchy
│   └── aesthetic.md             ← Intel Architecture Day color/type/lighting
├── scripts/
│   ├── new-block.ts             ← Generator: emit a new procedural block + label
│   └── audit-perf.sh            ← Perf sanity check (draw calls, KTX2 presence)
└── assets/
    ├── chip-spec.example.ts     ← Starter taxonomy
    └── tones/intel-arc.css      ← Color tokens
```

### The complete SKILL.md

```markdown
---
name: astra-tma-3d
description: Cinematic exploded-isometric 3D React frontend patterns for Intel CPU/microarchitecture diagnostic tools. Use this skill whenever the user is working in the ASTRA-TMA frontend codebase or asks about React Three Fiber (R3F), three.js, drei, @react-three/postprocessing, exploded-view 3D, chip floorplan visualization, PBR materials for hardware diagnostics, cinematic camera choreography, drill-down 3D navigation, or wiring EMON/TMA rules-engine output into a 3D scene. Trigger on phrases like "exploded chip view", "Lion Cove visualization", "drill into front-end", "3D diagnostic", "Intel Architecture Day look", "TMA scene", "explode the decode cluster", or any request involving R3F + cinematic post-processing. Make sure to use this skill even when the user does not say "ASTRA" explicitly, as long as the request is clearly about 3D microarchitecture visualization in this codebase.
license: Internal Intel use only
---

# ASTRA-TMA 3D Skill

This skill captures the standing aesthetic and engineering rules for the ASTRA-TMA 3D frontend. The frontend dissects an Intel Lion Cove P-core into floating, glowing, exploded layers and lets a user drill 6+ levels deep into microarchitectural blocks while the backend rules engine annotates each block with severity-coded findings.

When you (Claude Code) edit this codebase, follow these rules. Defer to `references/*.md` for the specifics of each domain.

## When to read which reference

| If the task is about... | Read first |
|---|---|
| Scene structure, instancing, R3F hooks, anti-patterns | `references/r3f-patterns.md` |
| PBR material choices, emissive glow, transmission | `references/materials.md` |
| Effect chain, bloom, AO, DoF, tone mapping | `references/postprocessing.md` |
| Camera moves, fitToBox, drill-down choreography | `references/choreography.md` |
| Rules-engine JSON shape, Zustand store, finding → mesh wiring | `references/data-contract.md` |
| What blocks exist in the chip, ports, lanes, hierarchy | `references/chip-taxonomy.md` |
| Color tokens, typography, lighting recipe | `references/aesthetic.md` |

Default to reading `references/r3f-patterns.md` and `references/aesthetic.md` on any non-trivial change — they contain the standing rules that touch most code.

## Standing rules (apply to all work)

### Architecture
- Procedurally generate every chip mesh from the TypeScript taxonomy in `src/data/chip-spec.ts`. Never hand-author a Blender mesh for blocks/sub-blocks. The chip housing is the only GLB asset.
- One Zustand store at `src/state/store.ts`. No Context, no Redux, no Jotai. Subscribe with selectors; never the whole store.
- The backend contract is the JSON schema in `references/data-contract.md`. Do not invent fields.

### Rendering
- WebGL2 renderer (not WebGPU yet — see `references/r3f-patterns.md` for the migration plan).
- `frameloop="demand"` is the default; call `invalidate()` from data updates and tween steps.
- ColorManagement enabled; `outputColorSpace = SRGBColorSpace`; tone mapping = AgX.
- Selective bloom: `luminanceThreshold = 1.0`. Only emissive materials with intensity > 1 bloom. Never set threshold to 0.
- Instance any geometry that repeats more than 4 times. Use raw `THREE.InstancedMesh` (not drei `<Instances>`) above ~100 instances per type.

### Aesthetic (the Intel Architecture Day look)
- Background: near-black with slight blue (`oklch(0.18 0.02 250)`). No skybox.
- Key light: warm directional from upper-right. Rim light: Intel Arc cyan (`#00b2ff`) from below-back.
- Materials: dark anodized aluminum for block bodies, brushed metal for interconnects, transmission material for the chip housing, emissive cyan edges on the focused subtree.
- Pulse only on CRITICAL severity, ~6 rad/s. YELLOW/RED have static elevated emissive intensity but do not pulse.
- HUD chrome: dark glassmorphic panels with NO `backdrop-filter: blur(>8px)` over the canvas — kills perf on Intel iGPUs.

### Camera choreography
- Use drei `<CameraControls>` (which wraps Yomotsu's `camera-controls`).
- Drill-down: `await cameraControls.fitToBox(targetMesh, true, { paddingTop: 0.2, paddingBottom: 0.2 })`.
- Sibling fade-out to 0.08 opacity on enter; restore to 1.0 on exit. Parent shells stay visible as wireframe `<Edges>`.
- Always update the breadcrumb store on focus change.
- Esc pops `focusPath`; reverse the camera move.

### Performance budget (hard limits)
- ≤ 200 draw calls at depth 0; ≤ 500 at any depth.
- ≤ 16 ms / frame budget at 1440p on a discrete-GPU Chrome workstation.
- KTX2 for all textures > 256². Meshopt for all GLB geometry.
- Hoist `THREE.Vector3` / `THREE.Color` allocations out of `useFrame`.

### Anti-patterns to refuse
- Mounting/unmounting meshes on focus change (use opacity + visibility instead).
- Setting `material.color` via React prop in a hot loop (lerp via ref in `useFrame`).
- Using drei `<Instances>` for > 100 instances (drop to raw `InstancedMesh`).
- Putting `backdrop-filter: blur(>8px)` on full-screen panels over the canvas.
- Calling `setState` from inside `useFrame` (it will infinite-loop or thrash React).
- Wrapping `<Canvas>` in React Strict Mode without explicit GPU resource cleanup.
- Using Inter, Roboto, or system fonts. The font stack is Geist + Geist Mono.
- Inventing fields on the rules-engine JSON contract.

## Companion skills
- For 2D HUD chrome aesthetics, defer to Anthropic's `frontend-design` skill — but override its font/color suggestions with the ASTRA palette above.
- For low-level Three.js API questions, defer to CloudAI-X's `threejs-*` skills.
- For long-form report output, defer to Anthropic's `docx` / `internal-comms` skills.

## Examples of triggering requests
- "Add a new execution port to the chip" → read `chip-taxonomy.md` + `r3f-patterns.md`, edit `chip-spec.ts`, mesh emits automatically.
- "Make the decode cluster pulse red when bad-spec is high" → read `data-contract.md` + `materials.md`, wire severity-driven `emissiveIntensity` lerp.
- "The camera move into Front End feels jerky" → read `choreography.md`, check `smoothTime` and the rest event handling.
- "Side panel is dropping framerate" → read `r3f-patterns.md` perf section; almost certainly a backdrop-filter issue.

## When the task is genuinely 2D
If the user asks for the side panel, top bar, or pure DOM/Tailwind work, this skill still applies for color tokens and typography. For everything else, defer to `frontend-design`.
```

Each `references/*.md` file is ~150–300 lines of code-dense reference, populated with the corresponding content from Sections 2, 4, 5, and 6 of this report. The SKILL.md above is the entry point that routes Claude Code into the right reference.

### Install steps

```bash
# Inside the project root:
mkdir -p .claude/skills/_external
git clone https://github.com/CloudAI-X/threejs-skills .claude/skills/_external/threejs-skills
for s in fundamentals materials lighting shaders postprocessing interaction geometry textures animation loaders; do
  ln -s _external/threejs-skills/skills/threejs-$s .claude/skills/threejs-$s
done

# Install Anthropic's frontend-design via Claude Code's plugin flow:
# (in Claude Code): /plugin install frontend-design@anthropic-skills

# Create the custom skill:
mkdir -p .claude/skills/astra-tma-3d/{references,scripts,assets}
# Paste the SKILL.md above into .claude/skills/astra-tma-3d/SKILL.md
# Populate references/ with the §2, §4, §5, §6 content from this report
```

---

## Section 9 — The Copy-Pasteable Claude Code Build Prompt

```
You are bootstrapping a brand-new React frontend for an Intel-internal tool called
ASTRA-TMA. The backend exists and emits JSON. Your job is to build the frontend.

The frontend is a cinematic, exploded-isometric 3D visualization of an Intel Lion
Cove P-core. It must look like the Intel Architecture Day 2021 Golden/Lion Cove
reveal slides: floating, glowing, stacked layers of the chip, with the user able
to click into any layer to zoom/explode it and recursively see what's inside, up
to 6 levels deep.

=== HARD CONSTRAINTS ===
- Desktop Chrome/Edge only. Discrete-GPU workstations.
- 60+ fps target, 120 fps stretch.
- Single developer. You (Claude Code) are the primary code generator.
- Real 3D, real PBR, real post-processing. No 2.5D fakery.
- 6+ levels of recursive drill-down.

=== STEP 1: SKILLS ===
Before writing code, install and activate the skill at .claude/skills/astra-tma-3d/.
That skill captures the aesthetic, perf, and data-binding rules. Read its SKILL.md
and references/*. ALSO activate:
  - frontend-design (Anthropic) — for HUD chrome aesthetics
  - threejs-fundamentals, threejs-materials, threejs-lighting, threejs-shaders,
    threejs-postprocessing (CloudAI-X) — for Three.js API patterns
If any rule in this prompt conflicts with the skill, the skill wins.

=== STEP 2: PROJECT BOOTSTRAP ===
  npm create vite@latest astra-tma -- --template react-ts
  cd astra-tma
  npm install three@^0.171 @react-three/fiber@^9.6 @react-three/drei@^10.7 \
    @react-three/postprocessing@^3 postprocessing n8ao zustand@^5 \
    @theatre/core @theatre/studio @theatre/r3f maath three-stdlib leva \
    lucide-react framer-motion react-markdown
  npm install -D tailwindcss@^4 @tailwindcss/vite @types/three @types/node \
    @gltf-transform/cli r3f-perf
  npx shadcn@latest init   # Neutral base, dark default, CSS variables
  npx shadcn@latest add button card sheet tabs command tooltip hover-card \
    slider scroll-area badge separator resizable sonner dropdown-menu
Configure Vite with the @tailwindcss/vite plugin and the @/* path alias to ./src
per the official shadcn Vite + Tailwind v4 install (ui.shadcn.com/docs/installation/vite).

=== STEP 3: FILE/FOLDER STRUCTURE ===
  src/
    main.tsx
    App.tsx
    index.css                # Tailwind + Intel Arc tokens
    state/
      store.ts               # Zustand: findings, focusPath, hover
      schema.ts              # TS types from the rules-engine contract
    data/
      chip-spec.ts           # The Lion Cove taxonomy (STEP 5)
    scene/
      ChipScene.tsx          # Top-level <Canvas> root
      Lighting.tsx
      EnvironmentSetup.tsx
      PostFX.tsx
      Layer.tsx
      Block.tsx              # Recursive
      InstancedTiles.tsx
      Annotations.tsx        # drei <Html> labels w/ collision
      MiniMap.tsx
    camera/
      Choreographer.ts       # useChoreographer() hook
      CameraControls.tsx
    hud/
      TopBar.tsx
      Breadcrumb.tsx
      FindingsPanel.tsx
      TelemetryStrip.tsx
    materials/
      glow.ts
      transmission.ts
      anodized.ts
    util/
      severity.ts
      project.ts
    lib/                     # shadcn util
    components/ui/           # shadcn components

=== STEP 4: RULES-ENGINE JSON CONTRACT ===
Generate src/state/schema.ts to match exactly. Do NOT invent or rename fields.

  interface TMAReport {
    traceId: string
    capturedAt: string                 // ISO 8601
    cpu: 'lion-cove' | 'redwood-cove'
    domains: Record<DomainId, DomainStatus>
    findings: Finding[]
    metrics: Record<BlockId, MetricSnapshot>
    narrative: Record<BlockId, string> // markdown
  }
  type DomainId = 'frontend' | 'ooo' | 'exec' | 'memory'
  type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL'
  type BlockId = string                // e.g. "frontend.decode.lane-3"
  interface DomainStatus { severity: Severity; summary: string }
  interface Finding {
    ruleId: string                     // e.g. "FE-001-BAD-SPECULATION"
    blockId: BlockId
    severity: Severity
    metric: number
    threshold: number
    message: string
    drillTarget?: BlockId
  }
  interface MetricSnapshot { [counterName: string]: number }

=== STEP 5: CHIP TAXONOMY ===
Generate src/data/chip-spec.ts. Expand children to cover the full Lion Cove block
diagram: 8-wide decode (was 6 in Redwood Cove), 192-entry µop queue (was 144),
5.25K-entry µop cache (was 4096), 18 execution ports (was 12), 576-entry ROB
(was 512), split integer + vector schedulers, 48 KB L0D + 192 KB L1D + 3 MB L2.

  export interface BlockSpec {
    id: string; label: string
    width: number; depth: number; height: number
    color?: string; children?: BlockSpec[]
    instanceOf?: string; count?: number
  }
  export const chipSpec: BlockSpec = {
    id: 'lion-cove', label: 'Lion Cove P-core',
    width: 12, depth: 12, height: 0.4,
    children: [
      { id: 'frontend', label: 'Front End', /* ... */, children: [
        { id: 'bpu',       label: 'Branch Predictor (8× wider)', /* ... */ },
        { id: 'fetch',     label: 'Fetch (64 B/cyc)',            /* ... */ },
        { id: 'decode',    label: 'Decode (8-wide)',             /* ... */, children: [
          { id: 'decode.lane', label: 'Decode Lane',
            instanceOf: 'decode.lane', count: 8 }
        ]},
        { id: 'uop-cache', label: 'µop Cache (5.25K)',           /* ... */ },
        { id: 'uop-queue', label: 'µop Queue (192)',             /* ... */ },
      ]},
      { id: 'ooo',    label: 'Out-of-Order Engine (576-ROB, split INT/VEC)', /* ... */ },
      { id: 'exec',   label: 'Execution Ports (18 wide)', /* ... */ },
      { id: 'memory', label: 'Memory Subsystem (L0D 48K / L1D 192K / L2 3M)', /* ... */ },
    ]
  }

=== STEP 6: SCENE / RENDERER SETUP ===
src/scene/ChipScene.tsx:
  <Canvas
    frameloop="demand"
    dpr={[1, 2]}
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

=== STEP 7: CAMERA CHOREOGRAPHY ===
useChoreographer() hook in src/camera/Choreographer.ts:
  - Subscribe to focusPath in Zustand
  - On focusPath change: compute box3 of target block (walk children)
  - controls.fitToBox(box, true, { paddingTop: 0.2, paddingBottom: 0.2, paddingLeft: 0.4 })
  - In parallel: tween sibling opacity 1 → 0.08 over 600 ms
  - In parallel: stagger-reveal children (scale 0.9 → 1.0 with 30 ms stagger)
  - Esc handler: focusPath.pop(); reverse
Use camera-controls' .smoothTime = 0.6 and onRest event for post-arrival
animations. Do NOT use setTimeout.

=== STEP 8: MATERIALS / LIGHTING ===
Lighting.tsx:
  - directionalLight [6,10,4] intensity 2.2 color #fff4e0 castShadow
  - pointLight rim [0,-2,-4] intensity 8 color #00b2ff distance 12
  - pointLight fill [-6,2,2] intensity 2.5 color #4dd0ff distance 20
  - ambientLight intensity 0.15
EnvironmentSetup.tsx:
  - drei <Environment files="/hdri/studio_small_09_2k.hdr" environmentIntensity={0.4} background={false} />
  - Download HDRI from polyhaven.com/hdris (search "studio small 09"), CC0 license
materials/glow.ts: MeshStandardMaterial color #0a1628, emissive severity-based,
  emissiveIntensity 2.4, metalness 0.6, roughness 0.35
materials/transmission.ts: drei <MeshTransmissionMaterial /> per references/materials.md

=== STEP 9: POST-FX ===
src/scene/PostFX.tsx uses the exact effect chain from references/postprocessing.md:
N8AO → Bloom (selective, threshold 1.0) → DepthOfField → ChromaticAberration →
HueSaturation → BrightnessContrast → Vignette → ToneMapping(AGX) → SMAA.

=== STEP 10: HUD / shadcn LAYOUT ===
  ┌─ TopBar (h-14) ────────────────────────────────────┐
  ├─ Breadcrumb ─┬─ <Canvas> ─┬─ FindingsPanel ────────┤
  │   (w-56)     │ (flex-1)   │ (w-96, shadcn Sheet)   │
  ├──────────────┴────────────┴────────────────────────┤
  └─ TelemetryStrip (h-20) ────────────────────────────┘
TopBar: trace selector (shadcn Command), time scrubber (Slider) if PresentMon-correlated.
Breadcrumb: clickable drill path with chevron separators, lucide icons.
FindingsPanel: Markdown via react-markdown, severity-colored badge per finding,
  click finding → focus its drillTarget block.
TelemetryStrip: live EMON counter readouts in Geist Mono, severity-tinted.
Fonts: Geist + Geist Mono from /fonts/. NO Inter.
NO backdrop-filter: blur(>8px) anywhere overlapping the canvas.

=== STEP 11: ACCEPTANCE CRITERIA ===
  [ ] Chip layers float vertically separated, rim glow visible from below
  [ ] Click any top-level layer → smooth fitToBox dolly + sibling fade
  [ ] Click any sub-block → recursion works ≥4 levels without disorientation
  [ ] Breadcrumb updates on every focus change
  [ ] Esc pops one level at any depth
  [ ] Hovering a block bumps emissive intensity (selective bloom kicks in)
  [ ] CRITICAL severity pulses at ~6 rad/s; RED/YELLOW static-elevated
  [ ] r3f-perf shows ≤ 200 draw calls at depth 0
  [ ] Frame time ≤ 16 ms on a discrete-GPU laptop in dev mode
  [ ] No setState calls inside any useFrame
  [ ] Mock TMAReport JSON via a "Load trace" debug button renders correctly
  [ ] Side panel narrative scrolls and matches the focused block

=== STEP 12: WHAT NOT TO DO ===
DO NOT:
  - Use OrbitControls (use drei CameraControls)
  - Author the chip in Blender (procedural only)
  - Use Inter, Roboto, or system fonts
  - Use drei <Instances> for >100 instances
  - Mount/unmount meshes on focus change (opacity + visibility instead)
  - Put backdrop-filter: blur(>8px) on panels overlapping the canvas
  - Add SSR/SSGI (perf cliff, not worth it for a chip scene)
  - Set Bloom luminanceThreshold to 0
  - Invent fields on the TMAReport contract
  - Use Redux, Jotai, or Context for app state (Zustand only)
  - Use Theatre.js for drill-down moves (only for the intro cinematic)
  - Ship a WebGPU renderer (WebGL2 only for v1)

When in doubt, re-read .claude/skills/astra-tma-3d/SKILL.md.
```

---

## Section 10 — Risks, Alternatives, What NOT to Do

### Common failure modes in cinematic R3F projects
1. **Over-engineering the asset pipeline.** Many R3F portfolios burn 80% of dev time on Blender/Substance + GLB optimization. For you, that risk surfaces as "let me bake some shadows in Blender" detours. Refuse in v1.
2. **The "I'll add SSR/SSGI" trap.** `realism-effects` looks gorgeous in demos and tanks production perf. Stick to the §2 effect chain.
3. **Mount/unmount thrash on drill-down.** Causes visible 200–500 ms stutters per click. Animate opacity, never unmount.
4. **Lazy loading the wrong layer.** Don't `<Suspense>` per-block — the user sees a hiccup at every drill. Suspend only at the chip-housing GLB.
5. **Forgetting `dispose()`.** WebGL leaks compound; after minutes of clicking around you've burned hundreds of MB of GPU memory. Cleanup in every `useEffect`.

### Bail-out plan: when to abandon 3D for 2.5D/SVG
- **Drop to 2D for level ≥ 5 detail** (cache way layouts, register file rows, FU slots). These are intrinsically 2D and 3D obscures them.
- **Drop entirely if** discrete-GPU testing shows <30 fps and instancing+LOD don't recover it. Likely cause on some IT-managed workstations: WebGL disabled in Chrome flags. Ship a 2.5D isometric SVG view as a feature-flagged degraded mode.
- **Hybrid is fine and probably correct**: 3D for top 4 levels, SVG for depth 5+. Also more accessible.

### 3D anti-patterns Claude Code commonly produces (the skill prevents these)
- Using `OrbitControls` instead of `CameraControls` (poor smoothing, no `fitToBox`).
- Creating new `THREE.Vector3()` inside `useFrame` (GC thrash).
- Setting `Bloom luminanceThreshold={0}` then complaining everything glows.
- Using `<Html>` without `transform` prop, labels rendering at wrong scale.
- Putting `useState` updates inside `useFrame` (infinite render loop).
- Forgetting `outputColorSpace` and shipping milky materials.
- Mounting Theatre.js Studio in production (massive bundle, debug-only).
- Using `MeshBasicMaterial` everywhere (no PBR response, flat scene).
- Hand-writing GLSL when TSL or built-in materials would work.

The custom skill enumerates each of these in its "Anti-patterns to refuse" list — the single most effective lever for first-try-correct R3F code.

---

## Recommendations (Staged, with Benchmarks)

**Day 1 (bootstrap + canvas)**: Run the §9 prompt. Get the chip housing + 4 stacked layers visible with the post-FX chain. **Benchmark**: r3f-perf shows the scene at 60 fps, draw calls ≤ 50. If it doesn't, debug post-FX setup before continuing.

**Day 2–3 (procedural blocks + drill-down)**: Generate all Lion Cove sub-blocks from `chip-spec.ts`. Implement `useChoreographer` with `fitToBox` + sibling fade. **Benchmark**: drill 4 levels deep with smooth (no-stutter) camera moves; breadcrumb updates correctly.

**Day 4 (data wiring)**: Build the Zustand store and schema. Wire a mock `TMAReport` JSON through a debug "Load trace" button. Severity → emissive lerp working. **Benchmark**: changing a finding's severity smoothly fades the block color in <200 ms; CRITICAL pulses.

**Day 5 (HUD chrome)**: Top bar, breadcrumb, findings panel (Markdown), telemetry strip. Tailwind v4 + shadcn. **Benchmark**: full UI present, frame budget still ≤ 16 ms (no backdrop-filter regression).

**Day 6–7 (polish)**: Collision-aware labels, mini-map, keyboard nav, perf audit, accessibility pass. **Benchmark**: tab through 30 blocks via keyboard; screen reader announces breadcrumb.

**Threshold to change strategy**:
- If frame budget exceeds 16 ms at depth 0 and instancing/LOD doesn't help → enable WebGPU renderer (post-r171 path).
- If WebGL2 is disabled on target workstation Chrome → flip to 2.5D SVG mode (build behind feature flag).
- If Blender housing GLB exceeds 5 MB after Meshopt + KTX2 → simplify geometry, not compression settings.

**Beyond Day 7**: real backend integration, Theatre.js intro cinematic, performance microbenchmarks per drill level, and the 2D handoff at depth 5+ for cache-way detail.

---

## Caveats

- **WebGPU production-readiness dates** are sourced from utsubo.com's Three.js 2026 retrospective and byteiota.com's WebGPU 2026 analysis; both cite three.js r171 (September 2025) as the production-WebGPU milestone with automatic WebGL 2 fallback, and Firefox 147 (January 13, 2026) as the cross-browser ship date. These are credible secondary sources, not Anthropic-grade primary docs; if you need to cite the exact release, link directly to the three.js r171 release notes on GitHub and the Firefox 147 release notes on Mozilla.
- **drei `<Instances>` perf cliff numbers** (~10 fps at 1000 instances) come from drei issues #1154 and #2041 user reports; your mileage will vary by GPU. The recommendation to switch to raw `THREE.InstancedMesh` above ~100 instances is conservative and safe.
- **The CloudAI-X `threejs-skills` repo** is community-maintained (MIT, ~398 stars as of Jan 2026 per the announcement coverage), not an Anthropic-official skill set. Review the SKILL.md content before installing in any compliance-sensitive environment.
- **The custom skill's "ASTRA" naming is yours to change** — the design pattern (one cohesive skill with `references/` subfolder, "pushy" description per skill-creator guidance, anti-patterns enumerated explicitly) is what matters and transfers to any successor name.
- **Frame budget claims** assume a discrete-GPU workstation (your target). On Intel iGPU laptops the budget tightens significantly; you'll need lower DPR (`dpr={[1, 1.5]}`) and a reduced post-FX chain.
- **Lion Cove specifics** (8-wide decode, 18 ports, 576 ROB, 5.25K µop cache, L0D/L1D/L2 sizes) are sourced from the Intel Tech Tour 2024 deck, AnandTech's Lunar Lake architecture deep dive, and the Chips and Cheese preview. Confirm against your internal Lion Cove BIA spec before encoding in `chip-spec.ts`; some Arrow Lake variants may differ.
- **`backdrop-filter: blur` perf claims** are qualitative based on common WebGL canvas + DOM blur interactions; if you're on a recent Chromium with GPU-accelerated compositing on a discrete GPU, the impact may be smaller than described. Always measure with r3f-perf before/after.
- The build prompt in §9 is engineered to be exhaustive on the first pass; expect to iterate it once you see Claude Code's first output. The skill in §8 is the durable artifact — the prompt is single-use bootstrap.