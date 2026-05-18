# Aesthetic for raptor-tma

Intel Architecture Day 2021 floating-glass-plate look — dark blue near-black backdrop, cyan rim glow, isometric camera, focused-block bright cyan border + halo, siblings fade to ghosts.

## Color tokens (OKLCH for perceptual uniformity)

Tokens in `assets/tones/intel-arc.css` — pull into Tailwind v4 via `@theme`:

```css
@theme {
  --color-bg:         oklch(0.18 0.02 250);    /* near-black blue, scene background */
  --color-bg-elev:    oklch(0.22 0.025 250);   /* HUD panels */
  --color-arc-cyan:   oklch(0.78 0.18 220);    /* ≈ #00b2ff — primary accent */
  --color-arc-glow:   oklch(0.88 0.20 220);    /* focused-block halo */
  --color-sev-green:  oklch(0.74 0.18 145);    /* finding GREEN */
  --color-sev-yellow: oklch(0.82 0.16 95);     /* finding YELLOW */
  --color-sev-red:    oklch(0.68 0.22 25);     /* finding RED */
  --color-sev-crit:   oklch(0.62 0.28 10);     /* finding CRITICAL */
  --color-grid:       oklch(0.30 0.02 250 / 0.35);  /* underlay grid */
}
```

## Lighting recipe (`src/scene/Lighting.tsx`)

**Two recipes** depending on scope. The MD's original values target a single-P-core scene. For whole-die ARL (4 large tile plates spanning ~7 units vertically), the lights need to be pushed back and brighter to reach all plates.

```tsx
{/* Whole-die ARL — Phase 2 verified at 60 fps */}
<directionalLight position={[6, 10, 4]} intensity={1.8} color="#fff4e0" castShadow />
<pointLight position={[0, -5, -8]} intensity={12} color="#00b2ff" distance={22} decay={1.6} />  // rim
<pointLight position={[-8, 3, 4]} intensity={2} color="#4dd0ff" distance={25} decay={1.8} />     // fill
<ambientLight intensity={0.22} />

{/* MD original (single P-core scope) — for reference */}
// <directionalLight position={[6, 10, 4]} intensity={2.2} ... />
// <pointLight position={[0, -2, -4]} intensity={8} distance={12} ... />
// <ambientLight intensity={0.15} />
```

Per-plate `<Layer>` adds a localized rim light underneath at `intensity={5}` `distance={Math.max(width, depth) * 1.5}` `decay={1.6}` to drive the "light leaking" cyan glow between plates.

HDRI: drei `<Environment files="/hdri/studio_small_09_2k.hdr" environmentIntensity={0.35} background={false} />` from Poly Haven (CC0). For Phase 2 dev, use `preset="studio"` (no file needed).

The cyan rim from below-back is what creates the "light leaking from underneath the chip plates" effect that defines the Architecture Day look.

## Background

```tsx
<color attach="background" args={['#0a1628']} />
<fog attach="fog" args={['#0a1628', 25, 60]} />
```

No skybox. Fog gives depth and hides the back wall when the camera tilts up.

## Fonts — Geist + Geist Mono only

```js
// tailwind.config.ts (or @theme block in index.css)
fontFamily: {
  sans: ['Geist', 'system-ui', 'sans-serif'],
  mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
}
```

Self-host from `public/fonts/` — Intel-internal compliance friendly. Get the OFL build from vercel/geist.

**Never** use:
- **Inter** — overused, generic (Anthropic's frontend-design skill: *"Avoid generic fonts like Arial and Inter"*)
- **Roboto** — looks unfinished
- **IBM Plex** — IBM brand baggage
- System fonts (`-apple-system`, `Segoe UI`, etc.) — unprofessional, inconsistent across machines

The `audit-perf.ps1` script greps for these.

## HUD chrome — the backdrop-filter trap

**Don't** put `backdrop-filter: blur(>8px)` on a full-screen panel overlapping the canvas. The browser re-rasterizes the canvas frame on every paint to feed the blur — measurable fps drop on iGPUs (less on the 4090, but still wasteful and the audit script flags it).

**Three safe alternatives:**

1. **Static-blur** (cheap, looks great)
   ```css
   background: rgba(10, 22, 40, 0.78);
   border: 1px solid rgba(0, 178, 255, 0.18);
   /* no backdrop-filter */
   ```

2. **Tiny blur** (acceptable on small surfaces)
   ```css
   backdrop-filter: blur(8px);  /* breadcrumb pill, hover cards only */
   ```

3. **Compositor blur** (position panels outside canvas bounding rect)
   Canvas inset 8rem 24rem 6rem 4rem; chrome surrounds, doesn't overlap.

## Severity behavior

- **Pulse animation only on CRITICAL** (~6 rad/s via `useFrame`-driven `sin(t * 6)`)
- YELLOW/RED are static-elevated `emissiveIntensity` — do NOT pulse
- Severity color transition: `mat.emissive.lerp(target, 0.08)` in `useFrame` (~12-frame settle)
- Never change material color via React prop (triggers shader recompile)

See `references/materials.md` for the full binding pattern.

## HUD layout

```
┌─ TopBar (h-14) ──────────────────────────────────────────────────────┐
│  [TMA-EXPERIMENTAL · ARL]  trace selector ▾   time scrubber          │
├─ Breadcrumb ─┬───── <Canvas> ─────┬─ FindingsPanel ───────────────────┤
│   (w-56)     │      (flex-1)      │   (w-96, shadcn Sheet, Markdown)  │
│              │                    │                                   │
│  Lion Cove   │                    │   ⚠ FE-001-BAD-SPECULATION        │
│  › FE        │                    │   Block: compute.p-core-0.frontend│
│  › Decode    │                    │   Severity: CRITICAL              │
│  › Lane 3    │                    │   ...                             │
├──────────────┴────────────────────┴───────────────────────────────────┤
│ Geist Mono live counter strip                                          │
└─ TelemetryStrip (h-20) ───────────────────────────────────────────────┘
```

- TopBar surfaces the TMA-experimental status (per `data-contract.md`)
- Breadcrumb chevron separators, lucide icons
- FindingsPanel: Markdown via react-markdown, severity-colored badges per finding, click → focus drillTarget block
- TelemetryStrip: live EMON counters in Geist Mono, severity-tinted text

## shadcn components

Init: `npx shadcn@latest init` → Neutral base, dark default, CSS variables.

Components to install:
```
button card sheet tabs command tooltip hover-card slider scroll-area
badge separator resizable sonner dropdown-menu
```

## Reference images

`F:\Raptor-K-E\reference images\Presentation1_page-000{1..7}.jpg` — 7 pages of Intel Architecture Day 2021 showing the progressive drill from L0 (whole chip) to L5 (individual FMUL/FADD).

Visual cues to honor:
- **Cyan rim glow underneath each plate** — the `pointLight` below-back from the lighting recipe
- **Focused-block bright cyan border + halo** — `<Edges>` + selective Bloom
- **Siblings fade to dim ghosts** (opacity 0.08, never destroyed)
- **Isometric camera at high elevation** — initial camera position `[8, 12, 14]` with `fov: 35`
- **"Light leaking from inside" the housing** — the per-block point light + emissive edges combo

## Iconography

Use **lucide-react** for HUD icons. Keep icon weight consistent (`strokeWidth={1.5}` is the standard for this aesthetic; default 2 looks too heavy in dark mode).

## Motion

For HUD entries/exits, use Framer Motion `<AnimatePresence>` with subtle transforms (translateX 8px, opacity 0 → 1, duration 200 ms). Don't over-animate — the 3D scene is already kinetic.

Severity transitions in the panel: badge color crossfade via Framer Motion `layoutId`, not abrupt color change.

## What NOT to copy from the reference images

- The Intel logo in the corner (we're not Intel marketing)
- The "Architecture Day 2021" footer ribbon (it's their event branding)
- The exact tile labels (our tiles are GPU / SoC / IO; theirs are core sub-blocks — different scope)
- The exact tile placement (our layout is data-driven from `chipSpec`, not a copy of their slide)

We're emulating the **aesthetic**, not reproducing the slides.
