# Phase 3 — Drill-Down Choreography (next-session prompt)

Paste this whole file as your first message in a fresh Claude Code session opened in `F:\Raptor-K-E\`. The `raptor-tma-3d` skill at `.claude/skills/raptor-tma-3d/` will auto-load via its frontmatter description (triggers on phrases like "drill into", "Lion Cove", "ARL", "fitToBox", "camera choreography").

---

## Where we are

**Phase 0** (data grounding) and **Phase 1** (custom skill authoring) and **Phase 2** (Vite bootstrap + L0 hero shot of 4 floating tile plates with full post-FX chain) are DONE. See:

- Project memory: `C:\Users\Administrator\.claude\projects\F--Raptor-K-E\memory\` — start with `MEMORY.md`, especially `[primary-goal]`, `[build-plan]`, `[feedback-stay-on-goal]`, `[feedback-tool-autonomy]`, `[feedback-proactive-memory]`, `[feedback-md-literal-values]`
- Golden spec MD: `F:\Raptor-K-E\compass_artifact_wf-707ed176-db74-42fa-aacd-1b0d4fab9bc7_text_markdown.md`
- Phase 0 findings: `F:\Raptor-K-E\phase-0-findings.md`
- Custom skill: `F:\Raptor-K-E\.claude\skills\raptor-tma-3d\` (SKILL.md + 7 references + 2 scripts + 2 assets)
- Frontend code: `F:\Raptor-K-E\frontend\src\` (Vite + React 19 + R3F 9 + drei 10; 60 fps, 56 draw calls at L0)
- Dev server: should still be running on `http://localhost:5173` (otherwise: `cd F:\Raptor-K-E\frontend && npm run dev`)

## The goal — Phase 3 is drill-down choreography

Per `[primary-goal]`: rendering is the goal, data binding is Phase 4. Phase 3 makes plates clickable and adds the recursive drill-down. See skill `references/choreography.md` for the full recipe.

**Hard acceptance criteria (from MD §9 STEP 11)**:
- [ ] Click any L0 tile plate → smooth `fitToBox` dolly + sibling fade-to-0.08 over 600 ms
- [ ] Recursion works ≥4 levels without disorientation (L0 tile → L1 cluster/core → L2 sub-block → L3 leaf)
- [ ] Breadcrumb HUD updates on every focus change (e.g. `Arrow Lake › Compute › P-core 0 › Front End`)
- [ ] **Esc pops one level at any depth** — reverses the camera move via the same `fitToBox` Promise
- [ ] Hover bumps `emissiveIntensity` (selective Bloom kicks in for the hovered mesh)
- [ ] Parent shells stay as wireframe `<Edges>` ghosts at opacity 0.15 (spatial memory)
- [ ] No `setState` calls inside any `useFrame` (skill anti-pattern)
- [ ] No mount/unmount on focus change (use opacity + `visible={false}`)
- [ ] Frame budget still ≤16 ms (target 60+ fps; we have headroom on the RTX 4090)

## Files that exist (and what's in them)

### Already in `src/`:
- `scene/ChipScene.tsx` — Canvas root, currently `frameloop="always"` (revert to `"demand"` once Phase 4 wires `invalidate()`). Camera at `[10, 11, 14]` fov 38. Renders only the 4 top-level tile plates via `Layer`. **Needs**: recursive child rendering (new `Block` component), click handlers, `useChoreographer` hook wiring.
- `scene/Layer.tsx` — currently renders one plate. **Refactor or keep**: probably keep as the L0-specific renderer; add a new generic `Block` component for L1+ recursive rendering.
- `scene/{Lighting, EnvironmentSetup, PostFX}.tsx` — done, don't touch
- `data/chip-spec.ts` — full whole-die taxonomy (P-cores → frontend/OoO/exec/memory; GPU Xe-cores → EU grids; SoC NPU NCEs → MAC arrays; etc.)
- `state/store.ts` — Zustand with `focusPath`, `pushFocus`, `popFocus` already in place; **add**: `focusableTree` for keyboard nav, helper to find a Block by path
- `state/schema.ts` — TMAReport types; don't extend yet
- `materials/{anodized, glow, transmission}.ts` — factories; use `anodized()` for inner block bodies
- `util/severity.ts` — severityColors + severityIntensity constants (used Phase 4)

### Needs to be created in `src/`:
- `scene/Block.tsx` — recursive renderer for `BlockSpec` (handles `instanceOf`/`count` for instanced children per skill r3f-patterns.md; emits anodized aluminum bodies; click + hover handlers; opacity ref-mutation via `useFrame` for sibling fade)
- `camera/Choreographer.ts` — the `useChoreographer` hook per skill `references/choreography.md`. Subscribes to `focusPath`; on change computes box3 of target mesh (walk children for bounds); `await controls.fitToBox(box, true, { paddingTop: 0.2, paddingBottom: 0.2 })`; in parallel fade siblings to 0.08 and stagger-reveal children scale 0.9→1.0 with 30 ms stagger
- `camera/CameraControls.tsx` — wrap drei `<CameraControls ref makeDefault smoothTime={0.6}>` and expose ref to Choreographer
- `scene/InstancedTiles.tsx` (optional; if `BlockSpec.instanceOf` count > 4, use this) — raw `THREE.InstancedMesh` per skill r3f-patterns.md
- `hud/Breadcrumb.tsx` — DOM breadcrumb showing `focusPath` as clickable crumbs. Tailwind + Geist font.
- `util/findBlock.ts` — `findBlockSpec(chipSpec, path: BlockId[]): BlockSpec | undefined` — walks the taxonomy

## Execution plan

1. **Use the skill** — the `raptor-tma-3d` skill will auto-load. Don't re-author it; consult `references/choreography.md` and `references/r3f-patterns.md` for every choreography or perf question. The skill has a "When to read which reference" routing table at the top of `SKILL.md`.
2. **Use `superpowers:test-driven-development`** if you start adding logic (find-by-path, focusable-tree walk). Optional but the project's standard.
3. **Use `chrome-devtools-mcp`** to verify visually after each milestone (click L0 plate → fitToBox should fire; screenshot at 1920×1080).
4. **Update memory** without being asked when you discover something — that's `[feedback-proactive-memory]`.
5. **Don't drift** into data plumbing — Phase 4 owns severity binding. Phase 3 is pure rendering choreography. See `[feedback-stay-on-goal]`.

## Suggested milestone order

1. Build `findBlockSpec` + `findMeshByPath` utilities (test-first if using TDD)
2. Build `Block.tsx` (recursive); switch L0 from `Layer` to `Block` for the 4 tiles
3. Wire pointer events on Block (click → `pushFocus`; pointerover → `hover`)
4. Wire `useChoreographer` (fitToBox + sibling fade); verify L0 → L1 transition works for one tile manually
5. Add Esc handler for `popFocus`; verify reverse transition
6. Add wireframe `<Edges>` ghosts for parent shells
7. Add Breadcrumb HUD with clickable crumbs
8. Drill ≥4 levels deep to verify recursion; tune `staggerReveal` timing
9. Optional: keyboard a11y (Tab/Enter walking the focusableTree)
10. Switch `frameloop` to `"demand"` once choreographer calls `invalidate()` correctly

## Tool autonomy is on

Per `[feedback-tool-autonomy]`: read memory, websearch, switch skills, and use any tool freely without asking. The chrome-devtools-mcp screenshot is the verification loop for visual work.

## When done

Send screenshots showing drill from L0 → L1 → L2 → L3 working smoothly. Update `[build-plan]` memory with Phase 3 status. Don't start Phase 4 unless explicitly asked.

---

**End of prompt. Compact this session first, then paste this as the next-session opener.**
