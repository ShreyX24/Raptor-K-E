# design-handoff/

Bundle for outsourcing Lion Cove L2 board styling to Claude Design
([claude.ai/design](https://claude.ai/design)). Designed so the artifact
that comes back is **directly machine-readable** — I just drop the JSON
into the renderer and the cells re-style automatically.

## Files

| File | Role |
|---|---|
| `DESIGN-PROMPT.md` | The prompt + workflow. Paste into Claude Design after creating a new prototype. |
| `DESIGN-SPEC-TEMPLATE.json` | Empty schema. Claude Design fills every field and returns it as `DESIGN-SPEC.json`. |
| `BAND-TAXONOMY.md` | Maps every chip-spec cell id → design band name. The renderer uses the same mapping at runtime. |
| `DESIGN-SPEC.json` | *(not yet present)* The filled-in spec. Save Claude Design's JSON here. |

## Flow

```
┌───────────────────┐    upload    ┌─────────────────┐
│  cell-color.jpg   │ ──────────▶  │                 │
│  board-full-      │              │                 │
│   frame.png       │              │  claude.ai/    │ produces  ┌────────────────┐
│  TEMPLATE.json    │              │   design       │ ────────▶ │ DESIGN-SPEC    │
│  BAND-TAXONOMY    │              │                 │           │   .json        │
│  DESIGN-PROMPT    │              │ (Opus 4.7, HF) │           │ + HTML preview │
└───────────────────┘              └─────────────────┘           └────────────────┘
                                                                          │
                                                                          │ save here
                                                                          ▼
                                                              F:\Raptor-K-E\design-handoff
                                                                          │
                                                                          │ I read it
                                                                          ▼
                                                              src/scene/ContextProjector.tsx
                                                              (BoardCell looks up its band's
                                                               material via bandFor(cellId))
```

## Why this shape

The reason Claude Design is the right hand-off here:
- It's vision-capable (sees the die-shot reference)
- It can produce **structured JSON** alongside an HTML mockup — that's the
  artifact I actually need
- The HTML mockup gives the human a visual gate before code changes

The reason this folder + template exists:
- Without a schema, Claude Design's output drifts into freeform CSS that
  I'd have to manually translate, line by line, into Three.js parameters
- With a schema, the values come back **typed and named exactly how the
  renderer consumes them** — zero translation, just `import spec from
  './design-handoff/DESIGN-SPEC.json'`

## When the design lands

Once `DESIGN-SPEC.json` is in this folder, ping me. I'll:
1. Add a `bandFor(cellId)` helper to `ContextProjector.tsx`
2. Pass `designSpec.bands[bandFor(spec.id)]` into `BoardCell`'s material
3. Update board plate / lighting / bloom from the spec's top-level keys
4. Reload + screenshot for comparison vs `cell-color.jpg`
