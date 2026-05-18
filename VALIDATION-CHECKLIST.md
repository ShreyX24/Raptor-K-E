# VALIDATION-CHECKLIST.md — Independent E2E Verification of raptor-tma

**For a fresh Claude Opus 4.7 session.** Open this file as your first message in a clean Claude Code session at `F:\Raptor-K-E\`. You are the independent verification agent. The implementation sessions are done; your job is to confirm whether the work is actually complete and correct, find bugs, and produce a signed verdict.

You will NOT trust the implementation session's claims. Every checklist item must be **independently re-verified** by you, in the actual running app, using Chrome MCP. Code reading is fine for orientation but the pass/fail judgment must come from observable runtime behavior.

---

## Mission

Verify that raptor-tma — a 3D Intel Arrow Lake (Core Ultra 9 285K / 270K+) TMA visualization — is complete to its current spec. Decide for each item: **PASS / FAIL / PARTIAL** with evidence.

Then write a final report at `F:\Raptor-K-E\VALIDATION-REPORT.md` with verdicts, screenshots referenced, bugs found, severity ratings, and a final sign-off.

---

## 0. Session bootstrap (do these once at the start)

### 0.1 Load skills you will need

Use `Skill` for skill names listed in your available-skills system reminder. Load these:

- [ ] **`raptor-tma-3d`** — the project's custom skill with all the architectural and visual rules. **Read this first.** It contains anti-patterns and the "what good looks like" — judge accordingly.
- [ ] **`superpowers:verification-before-completion`** — discipline for not claiming "passes" without evidence
- [ ] **`chrome-devtools-mcp:chrome-devtools`** — read the techniques for snapshotting + interacting with pages

### 0.2 Read the foundational docs

- [ ] `F:\Raptor-K-E\LAYER-PLAN.md` — authoritative per-tile drill hierarchy with citations. Use as ground truth for "what should be at each drill level."
- [ ] `F:\Raptor-K-E\PHASE-4-PROMPT.md` — the original Phase 4 spec (IHS + delid + binding). Compare what's built to what was specified.
- [ ] `F:\Raptor-K-E\compass_artifact_wf-707ed176-db74-42fa-aacd-1b0d4fab9bc7_text_markdown.md` — golden spec from the start of the project. Visual / aesthetic / camera rules.
- [ ] `F:\Raptor-K-E\phase-0-findings.md` — what's known about the backend data + EMON taxonomy.
- [ ] `C:\Users\Administrator\.claude\projects\F--Raptor-K-E\memory\MEMORY.md` — read every linked memory file. Pay attention to `[[l0-layered-layout]]`, `[[camera-top-down]]`, `[[primary-goal]]`, `[[feedback-stay-on-goal]]`, `[[chrome-uncapped-fps]]`, `[[phase-4-ihs-spec]]`.

### 0.3 Start the dev server

- [ ] Check if Vite is running on port 3000 (`curl -s http://localhost:3000`)
- [ ] If not, start it: `cd F:/Raptor-K-E/frontend && npm run dev` (in background)
- [ ] Wait for "ready in ... ms" before continuing
- [ ] For real frame-rate readings: launch `F:\Raptor-K-E\scripts\launch-chrome-uncapped.ps1` — this opens a separate Chrome with VSync disabled. The MCP-controlled Chrome is locked at 60 fps by the monitor; the uncapped window shows true engine perf.

### 0.4 Load Chrome MCP tools

Use `ToolSearch` to load:
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_pages`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__new_page`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_snapshot`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__click`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__hover`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__resize_page`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_console_messages`
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests`

Also: `TaskCreate`, `TaskUpdate`, `TaskList` for tracking your own progress.

### 0.5 Navigate and resize

- [ ] `navigate_page url=http://localhost:3000`
- [ ] `resize_page width=1920 height=1080`
- [ ] `list_console_messages` — note any console errors at startup. Errors are FAIL conditions.

### 0.6 Dev console hook

The store is exposed at `window.__raptor` in dev (per `frontend/src/state/store.ts`). Use `evaluate_script` to call:
```js
window.__raptor.getState()                     // inspect state
window.__raptor.getState().loadTrace(trace)    // trigger delid + populate findings
window.__raptor.getState().pushFocus('compute') // drill in
window.__raptor.getState().popFocus()          // pop one level
window.__raptor.getState().focus([])           // reset to L0
```

Sample full mock trace is at `src/data/mockTrace.ts` — load via `import` is messy; easier to inline a literal in `evaluate_script` (see Section 4.1 for a working snippet).

---

## 1. Phase 2 — Environment + L0 render baseline

Verify the foundation still works after Phase 3 + 4 changes layered on.

- [ ] **1.1 Page loads without console errors.** `list_console_messages` → no `error` level entries that aren't from a CDN font fetch failure (font has fallback, those are OK).
- [ ] **1.2 Canvas exists and renders.** `evaluate_script` → `!!document.querySelector('canvas')` returns true.
- [ ] **1.3 R3F + Three.js working.** `evaluate_script` → `window.THREE !== undefined || document.querySelector('canvas').toDataURL().length > 1000`. Some non-blank pixel content.
- [ ] **1.4 r3f-perf overlay visible bottom-left in dev.** Snapshot the page and look for the perf widget.
- [ ] **1.5 TMA-EXPERIMENTAL banner top-left.** Verify text reads `TMA-EXPERIMENTAL · ARL` in **IntelOne Display Bold** (compare the strokes — bolder than Geist).
- [ ] **1.6 Background colour matches `oklch(0.18 0.02 250)`.** Inspect the canvas background. Should be near-black blue, NOT pure black.
- [ ] **1.7 AgX tone mapping active.** No way to inspect directly — but the rendered colors should look filmic/cinematic, not flat-sRGB. Compare to the reference images in `F:\Raptor-K-E\reference images\`.

---

## 2. Phase 3 — L0 layout + drill choreography

### 2.1 Initial state (`bootState = 'lidded'`)

- [ ] **2.1.1 BootState is `lidded` on first load.** `evaluate_script → window.__raptor.getState().bootState === 'lidded'`.
- [ ] **2.1.2 IHS (heat-spreader lid) covers the chip area.** Take screenshot — large brushed-metal portrait rectangle dominates the center. No raw chiplets visible.
- [ ] **2.1.3 Chiplets are NOT raycast-targetable while lidded.** Use `evaluate_script` to compute mouse coords over where a chiplet WOULD be (e.g. center-left at ~720, 500 in 1920×1080) and dispatch a synthetic `pointermove`. Then check `window.__raptor.getState().hoveredBlockId`.
  - **Expected**: `null` — hover should not register on hidden chiplets.
  - **If non-null or if anything visibly lifts**: this is a FAIL. The pointer events are bleeding through the lid to invisible chiplets. Report as a bug with this exact reproduction.

### 2.2 Camera angle (`lidded` state)

- [ ] **2.2.1 Camera at IHS view, not canonical L0.** Per `[[camera-top-down]]`: lidded uses ELEV=65° / AZIM=0° / dist=32. Canonical L0 uses ELEV=72° / AZIM=0° / dist=36. Visually: the IHS lid should appear closer + with a slightly less top-down angle than the post-delid view.
- [ ] **2.2.2 Chip orientation is portrait, head-North.** The IHS rectangle is taller than wide. "intel" wordmark at TOP of lid, batch ID at BOTTOM.

### 2.3 Post-delid drill — verify after running `loadTrace` (see Section 4.1)

- [ ] **2.3.1 L0 floorplan matches `[[l0-layered-layout]]`**:
  - Compute Tile top-left
  - GPU Tile top-right
  - IOE Tile bottom-left
  - SoC Tile bottom-right
  - **All 4 chiplets visible, separated by visible base substrate gaps.**
- [ ] **2.3.2 Hover an L0 chiplet → lifts smoothly.** Use `evaluate_script` to dispatch a pointermove at a chiplet's center. The chiplet should lerp upward in Y. Take screenshot during the lift.
- [ ] **2.3.3 Hover-lift damps frame-rate-independently.** Should look smooth at 60 fps. No jitter.
- [ ] **2.3.4 Click L0 chiplet → drill to L1.** Use `evaluate_script → window.__raptor.getState().pushFocus('compute')`. Verify:
  - Compute chiplet becomes a wireframe ghost (cyan outline only, ~0.15 opacity)
  - Other 3 chiplets fade to opacity 0.08
  - 13 L1 children of Compute mount above (8 P-cores + 4 E-clusters + L3 ring)
  - Camera dollies to frame the new L1 layer
  - Breadcrumb HUD appears top-center with "Arrow Lake › Compute Tile (...)"
- [ ] **2.3.5 Drill ≥4 levels deep.** `pushFocus('compute') → pushFocus('compute.p-core-0') → pushFocus('compute.p-core-0.frontend') → pushFocus('compute.p-core-0.frontend.decode')`. Breadcrumb should read 4 entries deep. Take screenshot at each level.
- [ ] **2.3.6 Esc pops one level.** Dispatch `keydown` Escape; verify focusPath shrinks by 1. Repeat 4× returns to L0.
- [ ] **2.3.7 Breadcrumb crumbs are clickable.** Take a snapshot, find the "Arrow Lake" button's uid, call `click`. focusPath should reset to `[]`.
- [ ] **2.3.8 Sibling fade is correct.** At any depth, blocks at the same level as the focused one but with different ids should be ~0.08 opacity, not 1.0.
- [ ] **2.3.9 Parent shells are wireframe ghosts.** When at L2, the L1 parent should be ~0.15 opacity with cyan `<Edges>` visible.

### 2.4 Top-down camera (canonical post-delid)

- [ ] **2.4.1 ELEV=72° / AZIM=0° / dist=36.** Per `[[camera-top-down]]`. Visually: chip is almost top-down with slight tilt; CPU "head" (Compute + GPU row) at top of screen, "tail" (IOE + SoC row) at bottom.
- [ ] **2.4.2 No horizontal rotation when at L0 ground state.** Lines of the chip should be axis-aligned with the screen.

### 2.5 Per-tile drill content — spot-check against `LAYER-PLAN.md`

- [ ] **2.5.1 Compute L1**: 8 P-cores (modules 0,1,4,5,6,7,10,11) + 4 E-clusters (modules 2,3,8,9) + L3 ring. The L3 ring label should say **"Ring Bus + 12 LLC slices (36 MB)"**, NOT "L3 Ring (HAC)". Inspect via `evaluate_script` on `findBlockSpec` or read the BlockSpec via the store.
- [ ] **2.5.2 Compute L2 (Lion Cove P-core)**: 4 sub-blocks: Front End, Out-of-Order, Execution Ports, Memory.
- [ ] **2.5.3 Compute L3 (Front End)**: 5 sub-blocks: Branch Predictor, Fetch, Decode, µop Cache, µop Queue.
- [ ] **2.5.4 Skymont cluster L2**: 4 cores + Shared 4 MB L2. **NO MSC** (MSC was removed; if present this is a regression).
- [ ] **2.5.5 GPU**: 1 Render Slice with Geometry Frontend + Rasterizer + 2 ROP + 4 Xe-cores. **No XMX, no L2.**
- [ ] **2.5.6 SoC**: NPU 3720 + Coherent Fabric + Memory Fabric + Display Complex + Media Complex + Security Complex + Power Manager + IMC + DMI/PCIe + 3 D2D edges. **NO IPU, no LP-island.**
- [ ] **2.5.7 IOE**: TBT4 + PCIe 5.0 (M.2 only) + Display PHY. **NO PCIe x16 GPU link** (that's on SoC).

---

## 3. Phase 4 Act 1 — IHS boot screen

- [ ] **3.1 IHS material is brushed dark nickel, NOT mirror-chrome.** Take screenshot; metalness should be moderate (~0.4), roughness high (~0.7). No mirror reflections on the lid surface.
- [ ] **3.2 Engravings visible and readable:**
  - "intel" wordmark at top (north edge)
  - "ARL CLIENT PLATFORM" (cyan accent, smaller)
  - "Intel Core Ultra 9 270K Plus" (hero label, center)
  - "SRQDS · L537F370" (batch ID, bottom)
  - All in **IntelOne Display Bold**. Take screenshot, look at letter shapes — should be bolder than default Geist.
- [ ] **3.3 No RGB loading border around the lid.** Per latest user direction this was reverted; only a clean IHS should be visible.
- [ ] **3.4 Load Trace button visible at bottom-center.** Dev-only; should NOT appear in `import.meta.env.PROD` builds (skip this check if you're testing the dev server).

### 3.4.x Bug-hunt during lidded state

- [ ] **3.4.1 Move mouse over EVERY area of the lid** via `evaluate_script` dispatching `pointermove` at several (x, y) grid points across the canvas. After each, check `window.__raptor.getState().hoveredBlockId` is `null` AND verify no chiplet has visibly moved.
  - **Common bug**: chiplets under the lid still receive pointer events and lift, becoming visible at the lid edges. Report any such occurrence with reproduction coords + screenshot.

---

## 4. Phase 4 Act 2 — Delid animation

### 4.1 Trigger delid via mock trace

Use this exact `evaluate_script` payload (matches `src/data/mockTrace.ts`):

```js
() => {
  const s = window.__raptor.getState();
  s.loadTrace({
    traceId: 'verify', capturedAt: new Date().toISOString(), cpu: 'lion-cove',
    silicon_family: 'ARL Client Platform',
    cpu_sku: 'Intel Core Ultra 9 270K Plus',
    batch_id: 'SRQDS · L537F370',
    domains: {
      frontend: { severity: 'YELLOW', summary: 'µop cache underused' },
      ooo: { severity: 'GREEN', summary: '' },
      exec: { severity: 'GREEN', summary: '' },
      memory: { severity: 'RED', summary: 'L2 miss rate elevated' },
    },
    findings: [
      { ruleId: 'fe-uop-cache-low', blockId: 'compute.p-core-0.frontend', severity: 'YELLOW',
        metric: 0.42, threshold: 0.55,
        message: 'µop cache hit rate 42% — below 55% target.',
        drillTarget: 'compute.p-core-0.frontend.decode' },
      { ruleId: 'mem-l2-miss', blockId: 'compute.p-core-0.memory', severity: 'RED',
        metric: 0.18, threshold: 0.08,
        message: 'L2 miss rate 18% — 2.25× target.' },
    ],
    metrics: {
      'compute.p-core-0.frontend': {
        'UOPS_DISPATCHED.THREAD': 1240000000,
        'IDQ.DSB_UOPS': 520000000,
      },
      'compute.p-core-0.memory': {
        'L2_RQSTS.REFERENCES': 102000000,
        'L2_RQSTS.MISS': 18400000,
      },
    },
    narrative: {
      'compute.p-core-0.frontend': 'Front-end stalls dominate at 42% µop cache hit rate.',
      'compute.p-core-0.memory': 'L2 demand miss rate is 18%, 2.25× target.',
    },
  });
  return s.bootState;
}
```

Expected immediate return: `'delidding'`.

- [ ] **4.2 bootState transitions `lidded → delidding`.** Verify via `evaluate_script` right after the call.
- [ ] **4.3 IHS animates upward AND fades out.** Take 3 screenshots during the ~1.2s animation (immediately, ~500ms in, ~1200ms in). Verify the lid lifts in Y and opacity decreases.
- [ ] **4.4 Camera dollies smoothly from IHS view to canonical L0.** During the delid, camera elevation should increase from 65° toward 72°, distance from 32 toward 36.
- [ ] **4.5 Chiplets fade in.** Between t=800ms and t=1200ms the chiplets should become visible at full opacity.
- [ ] **4.6 bootState transitions `delidding → delidded` once IHS opacity hits ~0.02.** Verify final state.
- [ ] **4.7 Total animation completes in ~1.2s.** Time it.
- [ ] **4.8 No visual hiccup / jank during animation.** Watch frame rate. r3f-perf should stay ≤16 ms (60+ fps). Snap a screenshot at midpoint.

---

## 5. Phase 4 Act 3 — Severity binding + PMU overlays + FindingsPanel

After delid completes, focusPath = `[]`. Drill in.

### 5.1 Severity emissive

- [ ] **5.1.1 Drill to L2.** `pushFocus('compute') → wait 700ms → pushFocus('compute.p-core-0')`.
- [ ] **5.1.2 Front End block glows YELLOW.** It should have a bright amber emissive that pops out of the scene (Bloom is amplifying it).
- [ ] **5.1.3 Memory block glows RED.** Crimson emissive.
- [ ] **5.1.4 OoO + Exec blocks stay default cyan.** No severity binding for those.
- [ ] **5.1.5 Severity glow tracks hover.** Hover over the Front End block — emissive intensity should bump higher.

### 5.2 CRITICAL pulse (not in default mockTrace — must inject)

- [ ] **5.2.1 Inject a CRITICAL finding** via `evaluate_script`:
```js
() => {
  const s = window.__raptor.getState();
  s.loadTrace({
    ...s.trace,
    findings: [
      ...s.trace.findings,
      { ruleId: 'critical-test', blockId: 'compute.p-core-0.ooo', severity: 'CRITICAL',
        metric: 99, threshold: 1, message: 'CRITICAL TEST' },
    ],
  });
}
```
- [ ] **5.2.2 OoO block pulses.** Should oscillate between brighter and dimmer at ~6 rad/s (~1 Hz). Take 2 screenshots ~500ms apart to confirm the intensity differs.
- [ ] **5.2.3 Other severities do NOT pulse.** YELLOW and RED should be static-elevated, not throbbing.

### 5.3 PMU counter overlays

- [ ] **5.3.1 Hover above Front End block at L2.** A small DOM overlay should appear anchored to its top face with `THREAD 1.24G` and `DSB UOPS 520.0M` (or similar formatted numbers).
- [ ] **5.3.2 Memory block overlay shows `REFERENCES 102.0M` and `MISS 18.4M`.**
- [ ] **5.3.3 Overlay border tint matches block severity.** YELLOW overlay has amber border, RED has crimson border, default has cyan.
- [ ] **5.3.4 Overlays disappear when block is hidden.** Drill into Front End at L3 — siblings (OoO/Exec/Memory) should hide their overlays.
- [ ] **5.3.5 Number formatting is correct.** Large numbers should be condensed (1_240_000_000 → "1.24G"). Verify via `evaluate_script` on the DOM text.

### 5.4 FindingsPanel

- [ ] **5.4.1 At L0 / L1 / L2 with non-finding focus → panel is hidden** (off-screen right).
- [ ] **5.4.2 Drill to `compute.p-core-0.frontend`** → panel slides in from the right within ~300ms.
- [ ] **5.4.3 Panel contents:**
  - Title "Front End (8-wide decode)" (or whatever the spec label is)
  - Severity badge "YELLOW" with pulse dot
  - Message text matching the finding
  - Metric value (0.42) vs threshold (0.55)
  - Rule id ("fe-uop-cache-low")
  - Narrative text
  - Drill-target hint
- [ ] **5.4.4 Panel border-left colored by severity.** Amber for YELLOW.
- [ ] **5.4.5 Esc / breadcrumb pop → panel slides out.**
- [ ] **5.4.6 backdrop-filter blur is ≤8px.** Inspect computed style. Per skill: blurs > 8px over the canvas re-rasterize every paint and tank perf.

---

## 6. Performance — frameloop=demand verification

The implementation switched to `frameloop="demand"`. Verify it actually saves frames when idle.

- [ ] **6.1 Inspect `frameloop` setting.** `evaluate_script` for the Canvas element:
```js
() => {
  const c = document.querySelector('canvas');
  // r3f stores frameloop on the canvas — varies by version. Easier: count animation frames over 1s of idle.
  return 'check via frame-count test';
}
```
- [ ] **6.2 Idle frame count test.** With the scene fully settled (no animations pending, not delidding, no CRITICAL severity):
```js
async () => {
  let count = 0;
  const inc = () => { count++; requestAnimationFrame(inc); };
  requestAnimationFrame(inc);
  await new Promise(r => setTimeout(r, 1000));
  return count;
}
```
Note: this measures rAF, not r3f's render count. r3f-perf is more direct — look at its FPS readout during idle vs interaction.
- [ ] **6.3 r3f-perf FPS drops to near 0 when idle.** Wait 2 seconds with no interaction. The FPS counter should NOT show steady 60 — it should drop to 1-5 (occasional frames for any residual animation). If it stays at 60 fps continuously, demand mode is broken.
- [ ] **6.4 Hovering / clicking spikes FPS back up.** Interact and verify the FPS jumps back to 60 during the animation, then settles back down.
- [ ] **6.5 With CRITICAL severity active, FPS stays at 60.** The pulse animation needs continuous frames — this is by design.
- [ ] **6.6 frame budget ≤16 ms at any depth.** Drill to L3 and watch r3f-perf during active hover — CPU + GPU should each stay well under 16 ms.

---

## 7. Visual quality — match the references

- [ ] **7.1 Compare against `reference images/hero-image.fill.size_1200x675.jpg`** — the Intel hero render that defines the aesthetic. The delidded L0 should evoke the same feeling: floating chiplets on a dark substrate with cyan rim glow underneath.
- [ ] **7.2 Compare against `reference images/processor-s-l400.jpg`** — the photo of the actual 285K IHS. The boot screen IHS should resemble this physical chip's surface (brushed nickel, engraved labels).
- [ ] **7.3 Background is dark blue `oklch(0.18 0.02 250)`** — not pure black, not gray.
- [ ] **7.4 No "milky" materials.** All renders should look HDR-graded after AgX tone mapping. If anything looks washed-out white, `outputColorSpace` is probably wrong.
- [ ] **7.5 Selective Bloom** picks up emissive blocks at intensity > 1.0. Severity-colored blocks should glow and bleed light slightly into surrounding pixels.

---

## 8. Bug-hunt — actively probe these failure modes

Don't just check the happy path. Try to break things.

- [ ] **8.1 Pointer events bleeding through hidden meshes.** While `bootState === 'lidded'`, hover at every (x, y) grid point on the canvas (e.g. 10×10 sample grid). Verify `hoveredBlockId` stays `null` AND no chiplet has lifted via Y position change. ⚠️ Known failure mode — write up if found.
- [ ] **8.2 Pointer events bleeding through faded siblings.** At L2, hover over a faded sibling (opacity 0.08). It should not lift, not bump emissive, not change cursor.
- [ ] **8.3 Pointer events bleeding through ancestor ghosts.** At L2, the L1 parent chiplet should be a wireframe ghost. Hover over its area — should not be clickable.
- [ ] **8.4 Drill into a block with no children (leaf).** e.g. `pushFocus('compute.p-core-0.frontend.decode')`. The block has `instanceOf` but no actual children. Verify the camera dollies but no new layer mounts above.
- [ ] **8.5 Esc spam.** Spam Esc 20 times at L0. focusPath should stay `[]`, no crashes.
- [ ] **8.6 Rapid drill+pop.** Push/pop focus rapidly via `evaluate_script` loop (e.g. 50 iterations). Watch for memory leaks, dangling animations, console errors.
- [ ] **8.7 Reload during delid animation.** Trigger `loadTrace`, then reload the page during the lift. The new session should boot cleanly at `lidded`.
- [ ] **8.8 Resize window mid-animation.** Resize from 1920×1080 to 1280×720 during a drill. Camera should re-fit; no broken aspect ratio.
- [ ] **8.9 Font CDN fails.** Block `db.onlinewebfonts.com` via DevTools network blocklist (or use `evaluate_script` to override CSS). Verify text falls back to Geist / system-ui without breaking the layout.
- [ ] **8.10 Z-fighting.** Look at edges where two meshes meet (chiplet bottom + base top, IHS top + label plane). Should NOT see flickering / striping. If present, the meshes are coplanar; needs a small Y offset.
- [ ] **8.11 Memory leaks.** Open the Memory tab in Chrome DevTools, snapshot heap, drill+pop 100 times via `evaluate_script` loop, snapshot again. Heap delta should be small (KB range, not MB).
- [ ] **8.12 The mesh registry doesn't accumulate stale entries.** Inspect `meshes.size` in `meshRegistry.ts` via `evaluate_script`:
```js
() => { /* meshRegistry isn't exported globally — read via React-DevTools or check via observable behavior */ }
```
If you can't directly inspect, use the symptom: stale refs would manifest as fitToBox jumping to wrong locations after many drills. Try it.
- [ ] **8.13 backdrop-filter blur over canvas > 8 px.** Inspect computed styles on FindingsPanel, Breadcrumb, BlockMetrics overlays. Anything > 8 px → flag.
- [ ] **8.14 Severity glow persists across re-loads.** Load mock trace, drill to L2 (Front End yellow). Pop to L0. Drill again to L2. Front End should STILL be yellow (severity is on the finding, not on focus).
- [ ] **8.15 PMU overlays follow the camera.** When camera moves during a drill, the Html overlays should track the block's top face — not be left behind at the old screen position.
- [ ] **8.16 Inspect for skill anti-patterns being violated:**
  - `setState` inside any `useFrame` callback (search the source via `Grep`)
  - `OrbitControls` instead of `CameraControls` 
  - drei `<Instances>` with > 100 instances
  - `Bloom luminanceThreshold={0}` (everything would glow — easy visual check)
  - `<Suspense>` per block
  - hand-written GLSL where TSL or built-in would work
  - mount/unmount on focus change (would cause hiccup; visual check)
- [ ] **8.17 Console error / warning census.** `list_console_messages` after a full drill+pop+reload cycle. Note count and severity of each.

---

## 9. Acceptance gates from the original spec (PHASE-4-PROMPT.md)

Cross-check the explicit Phase 4 acceptance criteria from the spec:

- [ ] **9.1 Page load shows IHS with brushed-metal look + text labels.** (No RGB border — that was reverted.)
- [ ] **9.2 No chiplets visible while `bootState === 'lidded'`.**
- [ ] **9.3 On `loadTrace()`, IHS lifts and fades over ~1s.**
- [ ] **9.4 Camera transitions smoothly from IHS view to canonical L0.**
- [ ] **9.5 Chiplets fade in as IHS fades out.**
- [ ] **9.6 Post-delid: identical to Phase 3 (drill / breadcrumb / Esc all work).**
- [ ] **9.7 No frame drops during the animation on 60 Hz workstation.**
- [ ] **9.8 Severity colors blocks correctly when data has findings.**
- [ ] **9.9 PMU counters visible as `<Html>` overlays on each block's top face.**

---

## 10. Bug report template

For each bug found, write an entry like this in `VALIDATION-REPORT.md`:

```markdown
### BUG-NNN: <short title>

**Severity**: BLOCKER / HIGH / MEDIUM / LOW / COSMETIC

**Where**: <file:line if known> / <component> / <ui location>

**Reproduce**:
1. ...
2. ...
3. ...

**Expected**:
<one sentence>

**Actual**:
<one sentence, with screenshot reference>

**Evidence**:
- Screenshot: `F:\Raptor-K-E\screenshots\validation-bug-NNN.png`
- Console output: (if relevant)
- evaluate_script return: (if relevant)

**Hypothesis** (optional):
<one sentence on suspected root cause>
```

Example (this is a real bug; verify it independently):

> ### BUG-001: Chiplets hover-lift while IHS is still on
>
> **Severity**: MEDIUM (visual glitch, not crashing)
>
> **Where**: `src/scene/Layer.tsx` — `handleOver` gates on `isGroundState` (`focusPath.length === 0`) but not on `bootState !== 'lidded'`
>
> **Reproduce**:
> 1. Load page (bootState = 'lidded'), do NOT click Load Trace
> 2. Move mouse over the area where a chiplet would be (e.g. (720, 500) for the IOE position)
> 3. Observe a translucent chiplet edge visibly lifting through the IHS lid surface
>
> **Expected**: Chiplets should be entirely inert while lidded — opacity 0 AND no pointer events.
>
> **Actual**: Pointer events still fire, hovered chiplet lerps Y upward, and its silhouette pokes through the IHS edges.
>
> **Hypothesis**: `handleOver` / `handleClick` need an additional `bootState !== 'lidded'` guard. Alternatively, the Layer's `<group>` could set `pointerEvents="none"` while lidded.

---

## 11. Final report structure

Write `F:\Raptor-K-E\VALIDATION-REPORT.md` with:

1. **Header** — date, environment (OS, Chrome version, monitor refresh rate), commit SHA at HEAD (`git rev-parse HEAD`)
2. **Summary** — total checks run, passed, failed, partial. Bullet list of FAIL/PARTIAL items.
3. **Phase verdict table** — Phase 2 / 3 / 4 Act 1 / Act 2 / Act 3 → PASS / PARTIAL / FAIL with one-line justification.
4. **Bug list** — all bugs found via the template above. Sort by severity (BLOCKER first).
5. **Anti-pattern audit** — any skill rules violated.
6. **Performance verdict** — actual measured FPS in MCP Chrome + (if available) the uncapped Chrome.
7. **Memory pointer freshness** — verify the memory files at `C:\Users\Administrator\.claude\projects\F--Raptor-K-E\memory\` still match the code reality. Note any drift.
8. **Recommendations** — what to fix next, what to defer, what's polish vs. blocker.
9. **Sign-off** — your final verdict: SHIP / FIX-FIRST / RETHINK. Be honest. If 50% of the checklist passes, do not write "SHIP".

---

## Operating instructions for you (the verification agent)

1. **Trust nothing.** The implementation session reported "all 30 tasks complete." That is a claim. Your job is to re-verify in the actual app, not by reading their summary.
2. **Use TaskCreate** for each major phase of the checklist. Mark each in_progress when working on it, completed when actually verified. Resist the urge to mark groups complete; granularity matters.
3. **Screenshot liberally.** Save evidence to `F:\Raptor-K-E\screenshots\validation-*.png`. Reference them in your report.
4. **If chrome-devtools-mcp profile is locked**, you may need to close any existing MCP Chrome session via `Stop-Process` on the right PID (be careful — DON'T kill the user's regular Chrome). The MCP profile lives at `C:\Users\Administrator\.cache\chrome-devtools-mcp\chrome-profile`. As a fallback, ask the user to close their existing MCP Chrome window.
5. **Be skeptical, but fair.** If an item passes, write a short reason. If it fails, write the exact reproduction. PARTIAL is a real verdict — use it when something works but has a caveat.
6. **Don't fix bugs.** This is verification only. Note bugs in the report; let the next implementation session fix them.
7. **Don't claim PASS without runtime evidence.** Code-reading is not verification. The whole point of this exercise is that runtime behavior diverges from code intent — that's how the IHS hover bug exists.
8. **Time-box yourself.** Aim to complete the checklist in one focused session. If you hit a major blocker (dev server won't start, every test fails), stop and write a partial report with the blocker named.
9. **Use your skills.** You have `superpowers:verification-before-completion` and the project's `raptor-tma-3d` skill — read them, apply their rules. The anti-pattern list in `raptor-tma-3d/SKILL.md` is half your bug-hunting hit list.

---

**End of validation prompt.** When you're done, the user wants to see `VALIDATION-REPORT.md` as your deliverable. Don't write a chatty summary in chat — write the report file.
