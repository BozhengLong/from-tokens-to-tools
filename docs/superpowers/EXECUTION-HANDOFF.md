# Execution Handoff — from-tokens-to-tools

> **Resume instruction (read this first):** Plan A is done & pushed. The next job is **executing Plan B** (the frontend demo) using **subagent-driven-development**. Plan B is at `docs/superpowers/plans/2026-05-29-plan-B-frontend.md` — 25 tasks, 6 phases. Start at Task 1 (or wherever `git log` shows you left off).

Last updated: 2026-05-29. Working model is now **Opus 4.8 (1M context)**.

---

## Where things are

- **Repo:** `~/workspace/from-tokens-to-tools/` — public GitHub: https://github.com/BozhengLong/from-tokens-to-tools (remote `origin`, branch `main`, `gh` authed as BozhengLong)
- **Design spec:** `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-design.md` (9 rounds of self-review; authoritative)
- **Plan A (done):** `docs/superpowers/plans/2026-05-29-plan-A-recording-pipeline.md` — tag `plan-a-complete`
- **Plan B (to execute):** `docs/superpowers/plans/2026-05-29-plan-B-frontend.md`
- **Recording integrity rules:** `docs/recording-notes.md`

## Current status

- ✅ **Plan A complete**: foundation + 9 tools + recording pipeline + **40 validated JSON files** (4 examples × 2 langs × 5 station files) in `src/data/examples/<id>/<station>.{zh,en}.json`. 32 unit tests pass, build green, pushed.
- ⬜ **Plan B not started**: no UI yet — `src/App.tsx` is still the Vite boilerplate (Task 1 strips it). Front-end is the whole remaining job.

## How to execute Plan B (the workflow that worked for Plan A)

Use **superpowers:subagent-driven-development**. Per task (or per small batch of mechanical tasks):

1. **Dispatch an implementer subagent** (general-purpose) with the FULL task text pasted in (don't make it read the plan file), plus context: repo path, latest commit, strict-TS notes, exact commit message. For mechanical UI tasks you can batch several tasks into one implementer call (Plan A batched Tasks 10-20 and 21-24 successfully).
2. **Spec-review subagent** — verify it built what was asked (read the code, don't trust the report).
3. **Code-quality review subagent** — for substantive/keystone tasks. Skip for trivial presentational components if build+typecheck pass.
4. Fix issues inline or via a follow-up subagent; mark task done; continue. **Don't stop between tasks** unless blocked.

**Commit conventions:** each task commits separately with the plan's exact message. Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Don't pass `-c commit.gpgsign=false` unless gpg actually breaks.

**Verification after each task/batch:** `npm test` (currently 32 tests) and `npm run build` must stay green.

## Tech stack ACTUAL versions (newer than typical docs assume)

- **React 19.2**, **Vite 8**, **TypeScript ~6** (3-tsconfig layout: root references `tsconfig.app.json` + `tsconfig.node.json`; `paths`/`@` alias live in `tsconfig.app.json`)
- **Tailwind v4** — CSS-first config. Theme tokens are in `src/index.css` inside an `@theme` block (NOT a `tailwind.config.ts`). Whiteboard utilities already exist: `bg-whiteboard-bg` (#FAF7F0), `text-whiteboard-ink` (#1A1A1A), `whiteboard-accent-blue` (#2C5282), `whiteboard-accent-orange` (#DD6B20); font families `font-sans` (Inter+CJK) and `font-hand` (Patrick Hand/Caveat). `@tailwindcss/vite` plugin in `vite.config.ts`.
- **Zustand 5**, **Zod 4**, **vitest 4**, **framer-motion ^12.40** (✅ installed). `@rollup/plugin-yaml ^4.1.2` wired in vite.config.ts (for importing YAML manifests). `@testing-library/react` + `jsdom` are NOT yet installed — Plan B Task 9 installs them.
- **Node v25**, ESM. `@` alias = `src/`. In `src/` use `@/...` imports. In `scripts/` use `.js` extensions (NodeNext).

## Conventions / gotchas (carried from Plan A)

- Strict TS: `noUnusedLocals`, `verbatimModuleSyntax` on → use `import type` for type-only imports; no unused vars.
- Tests: vitest `include: ['src/**/*.test.ts']`, global env `node`. Hook/DOM tests need `// @vitest-environment jsdom` docblock at top of the file (Plan B installs `@testing-library/react` + `jsdom` in Task 9).
- Do NOT commit scratch files (`_probe.ts`, `_dbg.ts`, etc.) or `.env`. `.env` is gitignored and contains the OpenAI key — never commit it; it has appeared in chat, so treat as sensitive.
- Plan B is self-contained: it only READS the recorded JSON; no API calls, no recording. So executing Plan B costs no API budget.

## Recorded data shapes (for briefing subagents) — defined in `src/types/schemas.ts`

- `TokenizeData` = `{ _meta, prompt, tokens: {id,text,byteRange:[number,number]}[] }`
- `LogitsData` = `{ _meta, steps: {stepIndex, contextPreview, topK: {token,tokenId,logprob}[]}[] }`
- `SamplingData` = `{ _meta, baseStep, baseStepLogprobs: {token,tokenId,logprob}[], paths: {method:'greedy'|'low-temp'|'top-p'|'high-temp', params, tokens: string[]}[] }`
- `FunctionCallData` = `{ _meta, reasoning, toolCandidates: {name,logprob}[], call: {name,arguments} }`
- `TopologyData` = `{ _meta, reactive: AgentLoopData, deliberative: {plan:{id,stepLabel,expectedToolCall?}[], execution:{planStepId:string|null,actualCall,observation,deviated}[], deviationSummary} }`
- `AgentLoopData` = `{ iterations:{thought,action:{name,arguments},observation}[], terminationReason:'text-final'|'final-action-called'|'max-iter', finalText?, terminationNote }`
- Manifests: `scripts/record/manifests/<id>.yaml` (importable via @rollup/plugin-yaml). Examples: `downloads-bigfiles`, `shanghai-weather`, `wikipedia-tweet`, `hn-weekend-pick`. Default example = `downloads-bigfiles`, default lang = `zh`.

## Plan B deferred items (NOT in scope unless user asks to fold in)

KaTeX formula (Station 3), "🔄 refresh from live" button, `save_*` real browser side effects (clipboard/notification/localStorage), deep mobile gesture polish, deployment. The user was told about these; the `save_*` side effects carry the most conceptual weight (design's answer to "aren't save_ tools fake?").

## Useful commands

```bash
cd ~/workspace/from-tokens-to-tools
npm test                 # 32 tests currently
npm run build            # tsc -b && vite build
npm run dev -- --port 5180   # manual visual check
git log --oneline | head -20 # see where execution left off
npx tsx scripts/record/validate.ts   # re-validate recorded data (no API)
```
