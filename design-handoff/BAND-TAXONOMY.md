# BAND-TAXONOMY.md

Maps every chip-spec cell id (in `lionCoveBoardBlocks`) to a design band. The
Claude Design output's `bands.<bandName>.material` block is applied to every
cell whose id matches the band's `$cells` glob.

| Cell id pattern | Band (design key) | Notes |
|---|---|---|
| `itlb-icache`, `bpu` | `frontEndCaches` | top row 1 — dark slate |
| `msrom`, `decode`, `uop-cache` | `decodeRow` | row 2 — dark slate, slightly lighter |
| `uop-queue` | `uopQueue` | row 3 — **bright blue** hero band |
| `allocate` | `allocateRename` | row 4 — teal band |
| `vec-rf`, `int-rf` | `registerFiles` | row 5 — light teal panels |
| `vec-sched`, `v-port-0`…`v-port-3`, `v-r8-*`, `v-r9-*`, `v-r10-*`, `v-fpdiv-*` | `vectorColumn` | bright cyan-blue active column |
| `x87-mmx` | `vectorFill` | deep blue fill at vector column bottom |
| `int-sched`, `p-port-0`…`p-port-5`, `i-r8-*`, `i-r9-*`, `i-mul-0`…`i-mul-2` | `integerColumn` | teal active column |
| `misc` | `integerFill` | dark teal — shows through MUL gaps |
| `sto-sched`, `sd-port-0`, `sd-port-1` | `storeDataColumn` | dark blue subdued column |
| `store-data` | `storeDataFill` | tall dark blue fill |
| `mem-sched`, `m-port-0`…`m-port-5`, `m-r8-*`, `m-r9-*` | `memoryColumn` | dark blue, slightly more saturated |
| `l0d`, `l1d`, `l2` | `cacheStack` | **deep blue / violet** — most saturated |

## How the renderer applies this

In `src/scene/ContextProjector.tsx`, the `BoardCell` component receives a
`spec: BlockSpec`. We add a helper:

```ts
function bandFor(cellId: string): keyof DesignSpec['bands'] {
  // strip parent prefix: "compute.p1.uop-queue" → "uop-queue"
  const id = cellId.split('.').pop() ?? ''
  if (id === 'itlb-icache' || id === 'bpu')           return 'frontEndCaches'
  if (id === 'msrom' || id === 'decode' || id === 'uop-cache') return 'decodeRow'
  if (id === 'uop-queue')                             return 'uopQueue'
  if (id === 'allocate')                              return 'allocateRename'
  if (id === 'vec-rf' || id === 'int-rf')             return 'registerFiles'
  if (id === 'vec-sched' || id.startsWith('v-port') || id.startsWith('v-r') || id.startsWith('v-fpdiv')) return 'vectorColumn'
  if (id === 'x87-mmx')                               return 'vectorFill'
  if (id === 'int-sched' || id.startsWith('p-port') || id.startsWith('i-r') || id.startsWith('i-mul')) return 'integerColumn'
  if (id === 'misc')                                  return 'integerFill'
  if (id === 'sto-sched' || id.startsWith('sd-port')) return 'storeDataColumn'
  if (id === 'store-data')                            return 'storeDataFill'
  if (id === 'mem-sched' || id.startsWith('m-port') || id.startsWith('m-r')) return 'memoryColumn'
  if (id === 'l0d' || id === 'l1d' || id === 'l2')    return 'cacheStack'
  return 'frontEndCaches' // safe fallback
}
```

The design spec JSON is imported at build time. `BoardCell` looks up its
band and uses the spec's material values directly on `<meshPhysicalMaterial>`.

## Visual reference

`F:\Raptor-K-E\reference images\cell-color.jpg` is the canonical aesthetic.
Match band colors to the regions in that image:

- The **bright blue full-width band** = `uopQueue`
- The **teal full-width band below it** = `allocateRename`
- The **slightly-lighter teal panels** to the left and right = `registerFiles`
- The **brightest, most cyan column** on the left = `vectorColumn` (with `vec-sched`, `V0-V3`, `FMA/FADD/ALU/SHIFT/SHUF/FPDIV` cells)
- The **deep blue rectangle at the very bottom-left** = `vectorFill` (X87/MMX)
- The **middle teal-green column** = `integerColumn` (P0-P5, ALU, JMP/SHIFT, MUL)
- The **dark area BEHIND the MUL row gaps** = `integerFill` (MISC) — should show through the gaps
- The **dark narrow column** to the right of integer = `storeDataColumn` + `storeDataFill`
- The **far-right wider column** with the schedulers and ports = `memoryColumn`
- The **deep blue/violet stack at the bottom-right** = `cacheStack` (L0/L1/L2)
