# DESIGN-PROMPT.md

Copy the prompt block below into a new Claude Design project at
[claude.ai/design](https://claude.ai/design). Upload the four attachments in
the order listed.

## Project setup in Claude Design

1. Open https://claude.ai/design → **New prototype**
2. Name: `lion-cove-board-styling`
3. Design system: **Default** (no team system needed)
4. Mode: **High fidelity**
5. Click **Create**

## Attachments (drag into the chat)

1. `F:\Raptor-K-E\reference images\cell-color.jpg` — visual target (the Intel die-shot we want to match)
2. `F:\Raptor-K-E\screenshots\board-full-frame.png` — current state of the 3D board
3. `F:\Raptor-K-E\design-handoff\DESIGN-SPEC-TEMPLATE.json` — schema to fill in
4. `F:\Raptor-K-E\design-handoff\BAND-TAXONOMY.md` — which cells belong to which band

## The prompt

```
I'm building a 3D Three.js visualization of an Intel Arrow Lake P-core
(Lion Cove) internal pipeline. The 3D board has ~60 named cells in rows
and columns. I need a design system that matches the attached die-shot
reference, applied per BAND (groups of related cells), not per individual
cell.

Attachment 1 (cell-color.jpg) — visual target. Match it as closely as you can.
Attachment 2 (board-full-frame.png) — what we have now (boring blue, no
   gradients, no glow, all bands look identical). The cell layout/positions
   are correct; only the COLOR/MATERIAL aesthetic needs to change.
Attachment 3 (DESIGN-SPEC-TEMPLATE.json) — STRUCTURED OUTPUT TARGET.
   Please return this file fully filled in, every field populated, with no
   empty strings or zeros remaining. This is what I will paste into
   Three.js MeshPhysicalMaterial directly.
Attachment 4 (BAND-TAXONOMY.md) — which chip-spec cells belong to which band.

Please produce TWO artifacts:

A) An HTML/CSS visual mockup of a flat 2D version of the board
   matching cell-color.jpg. Use the same band groupings from
   BAND-TAXONOMY.md. This lets me visually validate the palette before I
   port to 3D.

B) The filled-in DESIGN-SPEC-TEMPLATE.json. Every field must be a real
   value — colors as #rrggbb hex, numerics in [0,1] for Three.js
   MeshPhysicalMaterial conventions (metalness, roughness, clearcoat,
   clearcoatRoughness, envMapIntensity, opacity), emissiveIntensity in [0,3].
   Comments ($notes / $cells / $die-shot-color / $comment) are hints —
   leave them in.

Material parameter guidance (Three.js conventions):
- color:             the base diffuse color (hex), what the surface "is"
- emissive:          self-glow color (hex); use a deeper saturated version
                     of `color` for cells that glow in the reference
- emissiveIntensity: 0.2-0.5 for subtle glow; 0.8-1.5 for the hero
                     blue/teal bands that visibly emit light
- metalness:         0.15-0.40 for matte plastic-like (matches ref);
                     0.6+ would make cells mirror-like (avoid)
- roughness:         0.45-0.75 for the slightly-glossy ceramic feel in ref
- clearcoat:         0.2-0.5 for a thin glass coating; 0 = none
- clearcoatRoughness:0.3-0.6 (lower = sharper clearcoat reflection)
- envMapIntensity:   0.3-0.8 (how strongly env reflections show)
- opacity:           1.0 unless the cell should be slightly translucent
                     (e.g. uop-queue could be 0.92 to feel glassy)

Edge parameters (drei <Edges> — visible cell borders):
- color:     usually a brighter version of the cell color; cyan
             (#00b2ff) for the rim glow on hero bands
- lineWidth: 1-2 for normal cells; 2-3 for hero bands

Label parameters (drei <Text> on each cell's front face):
- labelColor:   text color on the cell, must read against the base color
- labelOutline: thin outline to keep text legible on bright bands

Aesthetic constraints (do NOT violate):
- This is the Intel Arc Day visual language. Cyan rim glow, dark anodized
  substrate, blue/teal cells, deep blue caches. No purple, no warm tones
  except very subtle key-light highlights.
- The substrate (board plate) is nearly black with a faint cyan emissive.
- The brightest, most saturated colors belong to:
    uopQueue   (bright blue, full-width hero band)
    cacheStack (deep blue / violet at bottom-right)
- The DARKEST areas are the top-row caches (frontEndCaches, decodeRow).
- The middle teal area (registerFiles, allocateRename) is medium
  saturation, slightly desaturated.

Hard constraints for the JSON output:
- Every field must have a value (no "" or 0 unless that's deliberately the
  spec for that property — e.g. a band that has no emissive can set
  emissive="#000000" and emissiveIntensity=0).
- Colors must be valid 7-char hex (#rrggbb). No 3-char shortcuts.
- The bands keys must match DESIGN-SPEC-TEMPLATE.json exactly. Do not
  rename, add, or remove top-level band keys.

After the JSON is filled in I will copy-paste it into my repo at
F:\Raptor-K-E\design-handoff\DESIGN-SPEC.json and the renderer reads it
to set MeshPhysicalMaterial on every cell.
```

## What you (the human) do after

1. Wait for Claude Design to produce the HTML mockup + filled-in JSON
2. Click **Export** → save the JSON content
3. Save it as `F:\Raptor-K-E\design-handoff\DESIGN-SPEC.json` (note: drop
   the `-TEMPLATE` suffix)
4. Optionally export the HTML preview for a side-by-side comparison
5. Tell me "design spec is ready" — I'll wire it through
   `ContextProjector.tsx` and trigger a rerender

## What I do after

1. Read `DESIGN-SPEC.json`
2. Add a `bandFor(cellId)` function to `ContextProjector.tsx` per the
   taxonomy
3. Update `BoardCell` to look up its band's material/edge/label settings
   from the spec instead of using hardcoded values
4. Update the board plate, lighting recipe, and bloom params to match
5. Reload + screenshot for you to compare against `cell-color.jpg`
