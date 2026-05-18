# Postprocessing for raptor-tma

## Stack

`@react-three/postprocessing` v3 wraps the pmndrs `postprocessing` library which merges compatible effects into a **single fragment shader pass** — faster than three.js's stock `EffectComposer` for our 4–6 effect stack.

**Skip `realism-effects`** (SSR + SSGI) — too heavy for a chip scene without reflective floors. Per MD §10 it's "the perf cliff."

## Exact effect chain (order matters)

```tsx
import {
  EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping,
  ChromaticAberration, BrightnessContrast, HueSaturation, SMAA, N8AO,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

<EffectComposer multisampling={0} enableNormalPass>
  <N8AO aoRadius={0.6} distanceFalloff={0.4} intensity={3}
        screenSpaceRadius color="#000814" quality="high" />
  <Bloom mipmapBlur intensity={1.4} luminanceThreshold={1.0}
         luminanceSmoothing={0.4} radius={0.85} levels={7} />
  <DepthOfField focusDistance={0} focalLength={0.04}
                bokehScale={3} height={720} />
  <ChromaticAberration offset={[0.0006, 0.0006]}
                       radialModulation modulationOffset={0.5} />
  <HueSaturation saturation={0.08} />
  <BrightnessContrast brightness={-0.02} contrast={0.12} />
  <Vignette eskil={false} offset={0.18} darkness={0.7} />
  <ToneMapping mode={ToneMappingMode.AGX} />
  <SMAA />
</EffectComposer>
```

Order rules:
- N8AO first — needs normal pass and unmodified scene depth
- Bloom before tone mapping — operates on HDR linear color
- Color grading (HueSat, BrightnessContrast) before AgX
- AgX before SMAA — tone map in linear space, antialias in display space

## Why AgX, not ACES, not Khronos PBR Neutral

**AgX** — Blender's default since 4.0. Filmic roll-off without ACES's hue skew. Available in three.js as `THREE.AgXToneMapping` (renderer) and `ToneMappingMode.AGX` (post-FX).

**ACES is wrong for us.** Per Khronos PBR Neutral release notes verbatim: *"One of the challenges of displaying true-to-life assets using traditional filmic tone mappers such as ACES is the limited range of reachable colors, especially when outputting bright yellow, green, or cyan hues to an sRGB screen."* — our Arc cyan (`#00b2ff`) glow turns white under ACES.

**Khronos PBR Neutral is wrong for us.** Built for e-commerce product viewing under neutral grayscale lighting. We want cinematic, not catalog.

Khronos's own guidance (3-way split):
- Linear → no HDR / no physical lighting
- Filmic (ACES, **AgX**) → strongly HDR scenes, wide input color gamuts, specific artistic looks ← **us**
- Khronos PBR Neutral → photorealistic PBR for e-commerce product viewing

## Selective bloom — the threshold rule

`luminanceThreshold = 1.0` (never 0). Bloom is **selective**: only materials whose emissive intensity pushes them above 1.0 light range will glow.

Per the @react-three/postprocessing Bloom docs: *"Bloom is selective by default, you control it not on the effect pass but on the materials by lifting their colors out of 0-1 range. a luminanceThreshold of 1 ensures that ootb nothing will glow, only the materials you pick."*

So: focused subtree gets `emissiveIntensity ≥ 2.0` (see `materials.md` recipe 1) and naturally glows; siblings at intensity 1.0 don't.

If everything is glowing → check threshold (should be 1.0, not 0). If nothing glows → check that the focused material has `emissive` set AND `emissiveIntensity > 1`.

## HDR / IBL

```tsx
import { Environment } from '@react-three/drei'

<Environment
  files="/hdri/studio_small_09_2k.hdr"
  environmentIntensity={0.4}
  background={false}
/>
```

HDRI from polyhaven.com/hdris — search "studio small 09", CC0. Save under `public/hdri/`.

Resolution: **1k–2k** for a closed chip scene. 4k is wasted on geometry that fills the frame.

drei's `<Environment>` runs `PMREMGenerator` for IBL convolution at startup automatically. `environmentIntensity` (prop on three 0.163+) modulates the IBL contribution without affecting `<directionalLight>` / `<pointLight>` rays.

## Renderer requirements (in ChipScene.tsx)

```tsx
gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
onCreated={({ gl }) => {
  THREE.ColorManagement.enabled = true
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.AgXToneMapping
  gl.toneMappingExposure = 1.0  // Phase 2 verified — 1.4 was too bright, 0.8 too dark
}}
```

## DoF trap (verified Phase 2)

**The MD's `focusDistance={0}` blurs the entire scene** because in `@react-three/postprocessing` v3 the value is normalized [0, 1] where 0 = near plane. With our camera near=0.1 far=100, focusDistance=0 means focal point at 0.1 units from camera → everything is bokeh-blurred to mush.

For Phase 2 L0: **disable DoF entirely**, the scene looks better without it. Re-enable in Phase 6 polish with either:
- `focusDistance ≈ 0.2` (camera at ~20 units from scene-center, far=100 → 20/100 = 0.2)
- OR an autofocus `focusTarget` ref bound to the currently-focused mesh — see camera-controls `getTarget()` for the recipe

```tsx
{/* Phase 2: DoF disabled — re-enable Phase 6 with focusDistance≈0.2 or autofocus */}
{/* <DepthOfField focusDistance={0.2} focalLength={0.04} bokehScale={1.5} height={720} /> */}
```

- `antialias: false` — SMAA in the chain handles AA; native MSAA would double-pass and waste GPU
- `powerPreference: 'high-performance'` — force discrete GPU on hybrid laptops
- `stencil: false` — not needed; smaller framebuffer
- `outputColorSpace = SRGBColorSpace` — without this, materials look milky

## Failure modes

| Symptom | Likely cause |
|---|---|
| Materials look milky / washed out | `outputColorSpace` not set to SRGBColorSpace |
| Everything glows blindingly | `luminanceThreshold` is 0 (or material `emissiveIntensity` ≫ expected) |
| Cyan rim turns white | Using ACES instead of AgX |
| Scene is mostly black | Tone mapping exposure too low, or no IBL `<Environment>` |
| 30 fps where we should hit 60+ | DoF `height` too high (try 480), or post-FX chain not merged (check imports) |
| Aliasing on edges despite SMAA | `<EffectComposer multisampling={0}>` missing (or SMAA isn't last) |

## R3F integration gotchas

- `@react-three/postprocessing` v3 has merged-shader optimization but requires the order in the chain above
- Don't wrap `<EffectComposer>` inside `<Suspense>` — keep it as a direct child of `<Canvas>`
- DoF `focusDistance={0}` + `focalLength={0.04}` gives a soft falloff on the back layers without blurring the focused subtree
- `<ChromaticAberration radialModulation>` makes the aberration strongest at the edges (cinematic) instead of uniformly across the frame
