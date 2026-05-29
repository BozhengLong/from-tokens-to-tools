# Execution Handoff — from-tokens-to-tools

> **Resume instruction (read first):** The next job is **executing Plan C2** (the v2 frontend zoom experience) using **superpowers:subagent-driven-development**. Plan C2 is at `docs/superpowers/plans/2026-05-30-plan-C2-frontend-zoom.md` — 22 tasks, hero-slice-first. Start at **Task 1** (or wherever `git log` shows you left off). Pre-flight + all data (Plan C1) are DONE — C2 is pure frontend that consumes them.

Last updated: 2026-05-30. Working model: **Opus 4.8 (1M context)**.

---

## Project in one paragraph

An interactive explainer: "why does a thing that only predicts the next *token* end up controlling your computer?" **v1** shipped (scroll narrative, 7 stations) but was judged "shows machinery, doesn't teach." **v2** is a redesign: a two-axis **semantic-zoom** journey (Structure Y) — pan a real agent's task *story*, zoom into any "model speaks" beat to discover it's just next-token prediction, all the way down to a **live token microscope** running a tiny model in the viewer's browser. Whiteboard / 3B1B aesthetic kept.

## Status

- ✅ **v1 complete** — tag `plan-b-complete` (reachable; no longer the mounted app).
- ✅ **v2 spec** — `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-v2-zoom-design.md` (self-reviewed, hardened).
- ✅ **Plan C1 (data/backstage) complete** — tag `plan-c1-complete`. 10 tasks. 70 tests pass, build green.
- 📝 **Plan C2 (frontend) WRITTEN, not started** — `docs/superpowers/plans/2026-05-30-plan-C2-frontend-zoom.md` (22 tasks). **← execute this next.**
- Repo: public GitHub `BozhengLong/from-tokens-to-tools` (origin/main; HEAD at the C2-plan commit). `gh` authed.

## How to execute (the workflow that's been working)

**superpowers:subagent-driven-development.** Per task (or small batch of mechanical tasks): dispatch an implementer subagent with the FULL task text pasted in (or point it at the exact plan task + paste the conventions + the critical gotchas below) → spec-compliance review (read the code, don't trust the report) → code-quality review for keystone tasks → mark done → continue without stopping. Commit each task separately with the plan's exact message + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (HEREDOC `-F -`; no `-c commit.gpgsign=false`).

For C2, the controller can also **verify the running journey via Playwright MCP** between tasks (as done for v1) — load the dev server, click Next/zoom, check no console errors.

## C2 user-gated tasks (need the human — pause for these)

- **Task 16 Step 3** — manual check of the live-model button in a real **WebGPU browser** (Playwright likely lacks WebGPU; the *recorded default* is verifiable headless).
- **Tasks 19 & 20** — the `clean-big-files` and `error-recovery` scenarios each need **one real Claude Code session** captured (same as C1's hero capture: run `claude` in the sandbox, fix/do the task, then the controller harvests the transcript from `~/.claude/projects/...`).
- **Task 22** — deploy decisions: host (GitHub Pages vs Vercel) + where the ~178 MB weights live.

The hero slice (Tasks 1–17) is otherwise autonomous; deliver it, then let the user eyeball the real demo before scaling.

## CRITICAL v2 facts & gotchas (hard-won in C1 — don't regress)

- **Browsers in CN cannot reach huggingface.co** (CORS + region) — confirmed. **node CAN reach `hf-mirror.com`.** ⇒ **Self-host the model weights same-origin.** Download once via node from hf-mirror; the browser loads from our own origin (`env.allowRemoteModels=false; env.allowLocalModels=true; env.localModelPath='/models'`). This also makes the deployed demo work in CN.
- **Live model = `HuggingFaceTB/SmolLM2-135M-Instruct`, dtype `q4`, ~178 MB.** (Qwen3-0.6B had no ONNX build; Qwen2.5-0.5B was ~500 MB — both rejected.) WebGPU verified: load ~750 ms, forward ~133 ms, real logits.
- **Read logits from the FLAT buffer:** `output.logits.data` (Float32Array) + `logits.dims`; last row = `[(seq-1)*vocab, seq*vocab)`. **NOT** `Tensor.slice().tolist()` (collapses dims in this transformers.js version).
- **Weights location:** C1 cached them at `scripts/v2/models/` (gitignored). **C2 Task 14 retargets the prefetch to `public/models/`** (gitignored) so Vite serves them at `/models/...`, and adds `npm run prefetch:model`. **Run `npm run prefetch:model` before the live button works** (dev + CI).
- **Default = recorded token data (tiny JSON, ships, instant, CN-safe); live model = opt-in behind a button** (~178 MB, browser-cached). The recorded path is the tested baseline and must always work.
- **Data model:** `src/types/v2-schemas.ts` — `StoryRun`/`Beat`/`ZoomContent` with **bilingual fields inline** ⇒ **ONE `story.json` per scenario** (not zh/en files). Real captured `thought`/`observation`/`seedContext` are single-language; only authored teaching text (title/summary/zoom/bridge) is bilingual. A beat's `zoom.seedContext` MUST equal the matching `BEATS` seed in `scripts/v2/capture-token-fallback.ts`.
- **`src/microscope/`** (built in C1): `dist.ts` (`topKFromLogits`, `sampleIndex`, `TokenProb`), `types.ts` (`TokenMicroscope` iface), `recorded.ts` (`RecordedMicroscope(fallback, beatId)`), `live.ts` (`LiveMicroscope.create(modelId?, onProgress?)`). **`dist.ts` imports `../utils/sampling` RELATIVELY** (not `@/...`) because a tsx node script imports it.
- **Hero data DONE:** `src/data/v2/fix-failing-test/{story.json (8 beats), token-fallback.json (b1,b3), raw-transcript.jsonl}` + `sandboxes/fix-failing-test/` (node:test buggy repo). Validated.
- **Harvester:** `scripts/v2/harvest.ts` (`harvestTranscript`) handles the real transcript shape (string-or-array content; granular thinking/text/tool_use; attaches narration to each tool call). Validator: `scripts/v2/validate-v2.ts`.

## Tech stack / conventions

- React 19.2, Vite 8, Tailwind v4 (CSS-first `@theme` in `src/index.css`; whiteboard tokens `whiteboard-bg/ink/accent-blue/accent-orange`, `font-hand`/`font-sans`), Zustand 5, Zod 4, framer-motion ^12.40, `@huggingface/transformers` (installed), vitest 4 + `@testing-library/react` + jsdom.
- Strict TS: `import type` for types; `noUnusedLocals` (prefix intentionally-unused params with `_`); **`erasableSyntaxOnly` ON → NO TS parameter-properties** (use explicit field decls). `@` = `src/`. tsx node scripts can't resolve `@` (use relative).
- vitest include = `['src/**/*.test.ts','scripts/**/*.test.ts']`, env `node`; DOM/hook tests need `// @vitest-environment jsdom` as the FIRST line.
- Reuse v1 whiteboard primitives (`src/components/whiteboard/`) + i18n pattern. v2 components live under `src/components/v2/`.

## Verification commands

```bash
cd ~/workspace/from-tokens-to-tools
npm test                              # 70 tests currently (v1 56 + C1)
npm run build                         # tsc -b && vite build
npx tsx scripts/v2/validate-v2.ts     # validate v2 story/token data
npm run prefetch:model                # (after C2 Task 14) download weights -> public/models
npm run dev -- --port 5193            # manual / Playwright check
git log --oneline | head -25          # where execution left off
```

## Task tracker

C1 tasks were tracked as TaskCreate #51–56 (all completed). For C2, create fresh tracking tasks (one per phase or per task) when resuming.
