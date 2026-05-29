# from tokens to tools — v2 "Zoomable Journey" Design

> Status: design (brainstorm-approved, pending user review of this doc).
> Supersedes the v1 experience (`plan-b-complete`) but reuses its infra. v1 stays reachable via the `plan-b-complete` tag.

**One-line goal:** Let a curious newcomer genuinely *understand* how an LLM goes from "predicting the next token" to "calling tools that solve a real problem" — by navigating a zoomable journey grounded in 100% real data.

---

## 1. Why v2 (the problem with v1)

v1 shipped a vertical-scroll narrative of 7 "stations" driven by real recorded data. Honest verdict after review: **it shows the machinery but does not teach.** A novice lands on terse one-line "hooks" + raw visualizations (token chips, prob bars, JSON) and is left thinking *"I see numbers, but what is this and why should I care?"* It's a data viewer for people who already know the concepts — not a path that builds understanding.

v2 fixes the pedagogy, not the aesthetic. The whiteboard / 3B1B look is kept; the **interaction model and information architecture** change.

---

## 2. Core experience — "A+": two-axis semantic zoom

Two independent gestures:

- **Pan (← →) = progress through the story (闯关).** You move forward deliberately, when you're ready. Progression is **curiosity-driven**: each beat ends by raising the exact question the next beat answers ("the model only emitted a line of text… so how did that text *do* anything?").
- **Zoom (in / out) = macro ↔ micro, reversible (反复进出).** At any beat you can dive into its inner mechanism, go deeper, then surface back to the map. This is the heart of the redesign.

**Semantic zoom, not pixel zoom.** Each zoom level shows *different, purpose-written content* — not the same picture magnified. Transitions animate as scale + crossfade so it *feels* like a continuous Google-Earth zoom, but every stop is a comprehensible, authored level (the 3B1B "camera push" feel).

**Cognitive principles this implements (the reason A+ beats a pure scroll or a pure nested zoom):**

1. **Advance organizer (Ausubel):** the macro map is seen first, so every detail you later zoom into has a place to hook onto.
2. **Whole → part → whole:** understanding crystallizes when you zoom *out* and see how the part fits. Zooming back marks the beat as "understood."
3. **Causal narrative spine:** humans remember "then this caused that." The left→right story is that spine. (A pure nested zoom — Powers-of-Ten style — was rejected because token→tool is a *causal/compositional pipeline*, not a *scale* story; conflating "deeper" with "next" blurs the narrative.)
4. **Progressive disclosure / cognitive load:** at any instant you are either on the low-detail map or focused on a single beat's micro — never flooded.
5. **Need-to-know:** each forward step answers a question you're now asking.

---

## 3. Structure Y — story is the spine, concepts live in the depth

The macro spine is **the agent's task story**, told in plain, relatable beats. The classic "LLM concepts" are **not** the spine — they are what you *discover* when you zoom into a beat. This is what makes the "no magic, just conventions" thesis land: you watch a real agent fix a bug, get curious about one step, zoom in, and discover *it was just next-token prediction shaped by conventions.*

**Example zoom map (hero scenario "fix a failing test"):**

| Macro beat (L0, pan) | Zoom in → |
|---|---|
| You say: "a test is failing, fix it" | — |
| Model decides to run the tests | **L1** it didn't "decide" — it predicted tokens → **L2** tokenize / per-step probability / sampling / how tokens form a `function call` → **L3** raw token ids + byte ranges, the real next-token distribution, the literal emitted JSON, and the parsing convention that turns that string into a command |
| Runtime really runs the tests → ❌ red | **L1** *not the model* — the runtime (your code) executes → **L2** a real test runner runs the sandbox project → **L3** the real runner stdout/stderr, failing assertion, `file:line` |
| Model reads the error → proposes an edit → file really changes | (same "model speaks" zoom machinery) |
| Re-run → ✅ green → done | **Zoom out:** this whole circle is the **Agent loop**; switching to "plan first" shows the **Deliberative** topology (toggle) |

**Concept → layer mapping:**

| Concept (from v1) | Where it lives in Y |
|---|---|
| Tokenization, Logprobs, Sampling, Function-call formatting | Deep zoom (**L2/L3**) under *any* "model speaks" beat — **reusable**: every model turn shares this machinery, so drilling different beats reinforces the same core |
| Tool execution | Zoom into a "runtime acts" beat (L1–L3) |
| Agent loop | Zoom out — the whole story is the loop |
| Reactive vs Deliberative | Macro-level toggle over the whole story |

---

## 4. Data — 100% real, from two honest sources

**Integrity contract (carried over from v1, non-negotiable — see `docs/recording-notes.md`):** model output is 100% real (re-roll, never hand-edit); tools are real code against real sandboxes/APIs; recorded once and replayed deterministically; where any value is illustrative, truncated, or unavailable, **the UI says so**. No fabrication anywhere.

Because the two layers of Structure Y have different data needs, they have two clearly-labeled real sources:

### Source A — a real Claude Code session (the story layer)
The macro story, tool calls, observations, loop, reactive/deliberative behavior, and **real execution results** are harvested from an **actual Claude Code session** transcript (the `.jsonl` session log). For the hero, we run a real Claude Code session against a real small buggy repo and capture it. This is maximally credible — it is a real agent doing real work with real side effects — and costs no external API budget.

*Why not also get the token internals here?* The Anthropic API exposes **no logprobs** to any client (not a Claude Code limitation — the upstream simply doesn't offer them). Codex's reasoning-model path doesn't expose them either. So the deepest layer needs a different, fully-inspectable source.

### Source B — Qwen3-0.6B in the viewer's browser (the deepest token layer)
The bottom-most "this is just next-token prediction" layer is powered by **Qwen3-0.6B running locally in the viewer's browser** via **transformers.js + WebGPU**, lazily loaded only when the user drills to the deepest zoom. transformers.js is chosen over WebLLM specifically because it exposes the **raw logits + tokenizer** — exactly what we are trying to show.

This makes the deepest zoom **live and interactive**: the viewer can type a snippet and watch real tokenization → the real next-token probability distribution → real sampling, and drag a temperature slider to **resample for real**. It runs entirely on the viewer's own device; no server, no API, ever.

It is honestly labeled: *"This is the universal next-token mechanism, shown on a small open model you can fully see inside. Claude works the same way internally — it just doesn't expose its probabilities."* The token mechanism is universal across models, so demonstrating it on an inspectable model is sound.

**Fallback:** on devices without WebGPU (old browsers, some mobiles), the deepest layer degrades to **pre-recorded real token data** (captured once from the same Qwen3-0.6B), with a notice. This satisfies the integrity contract and keeps the experience whole.

**The tiny model does NOT do the task.** A 0.6B model can emit function-call-shaped text but is not a reliable agent — and it doesn't need to be. Real tool-calling/agentic work comes from Source A. Source B is only the token microscope. *Optional:* feed it a short fixed prompt so it generates a function-call-shaped snippet token-by-token live (concept ④ "tokens become a command" shown live); if it's too incoherent even for that, fall back to plain-text generation + explanation.

---

## 5. The three scenarios (difficulty + domain gradient)

| Tier | Scenario | Source A capture | Notes |
|---|---|---|---|
| 🎯 Hero (deep) | **Fix a failing test** | Real Claude Code session on a real small buggy repo (e.g. a `applyDiscount` that doesn't cap at 100%). Rich loop: read → run tests → red → locate → edit → re-run → green. | The iconic agent coding loop; best showcase of read-observation→act→verify→loop and of token→tool→real side effect. |
| 🟢 Simple | **Clean big files** | Real Claude Code session listing `~/Downloads`, sizing files, filtering > 1 GB, writing a list. | Simple, concrete; gentle on-ramp. |
| 🌤 Life | **Error recovery** | Real session where a tool fails / a fetch 404s and the agent changes strategy (we hit a real instance of this in v1: a Wikipedia article was renamed). | Best answer to "why does a *loop* exist" — the agent hits a wall and replans. |

All three thread through the same zoom structure (Structure Y). The example switcher swaps the story; the hero is the most deeply authored. The deepest token layer (Source B) is shared across all three.

---

## 6. Tech architecture

**Stack unchanged:** React 19, Vite 8, Tailwind v4 (CSS-first `@theme`), Zustand 5, Zod 4, framer-motion. Reuse v1's whiteboard primitives, i18n infra, store pattern, Zod-as-source-of-truth, in-memory FS, and the `recording-notes.md` integrity rules.

**New core units:**

1. **ZoomStage engine** — the semantic-zoom primitive. Holds, per beat, a stack of authored zoom levels; animates scale + crossfade between levels; tracks `(panIndex, zoomDepth)`; renders a persistent "you are here + how deep" indicator; supports click / keyboard / scroll-to-zoom and `prefers-reduced-motion`. One focused, independently testable component with a clear interface (`levels`, current depth, callbacks).
2. **TokenMicroscope** — wraps transformers.js + Qwen3-0.6B-ONNX (via WebGPU). Lazy-loaded. API: `tokenize(text)`, `nextTokenDistribution(context) → {token, logprob}[]` (top-k from real logits), `sample(dist, temperature)`. Live temperature slider re-samples for real. WebGPU capability detection; recorded-data fallback path behind the same interface.
3. **Data model v2 (Zod schemas)** — `StoryRun = { meta, beats: Beat[] , topology }`; `Beat = { kind: 'user' | 'model-speaks' | 'runtime-acts' | 'final', thought?, toolCall?, observation?, zoom?: ZoomContent }`; `ZoomContent` references the per-beat L1/L2/L3 material (and, for "model speaks" beats, the recorded token-fallback slice). Loop/deliberative shapes carried from v1's `AgentLoopData`/`TopologyData` where they still fit.
4. **Recorder v2** — a harvester that converts a real Claude Code session transcript (`.jsonl`) into a validated `StoryRun` JSON, plus the buggy-repo fixture for the hero, plus a one-time Qwen3-0.6B capture producing the recorded token fallback.

**Deploy:** static build on Vercel (or GitHub Pages). **Zero server compute** — the model runs in the viewer's browser. Model weights load from the **HuggingFace CDN** (keeps the deploy small; GH Pages is poor for hundreds of MB of binaries). WebGPU required for the live microscope; otherwise the recorded fallback is served.

**What is replaced:** v1's scroll narrative, the 7 fixed station components, and the per-station data files (`tokenize/logits/sampling/function-calls/topology.json`) are superseded by `StoryRun` + zoom layers. v1 remains at tag `plan-b-complete`.

---

## 7. Pre-flight verification (MUST pass before frontend build)

A spike, before committing to the frontend, mirroring v1's "probe logprobs first" discipline:

- In a blank Vite page, load **`onnx-community/Qwen3-0.6B` (transformers.js-compatible ONNX build)** via WebGPU and confirm we can: (a) load it, (b) tokenize text, (c) read **logits** for the next token, (d) compute top-k probabilities, (e) sample, (f) acceptable download size + first-load time.
- Disable Qwen3 "thinking" mode for the demo (we want plain next-token generation to show the distribution).
- **Fallback if blocked:** if a usable Qwen3-0.6B ONNX/WebGPU build is unavailable or too heavy, drop to **Qwen2.5-0.5B-Instruct** (known transformers.js-compatible). Document whichever is used.

Outcome recorded in `docs/recording-notes.md`.

---

## 8. Open risks & mitigations

| Risk | Mitigation |
|---|---|
| WebGPU absent (old browser / mobile) | Recorded real-token fallback behind the same `TokenMicroscope` interface; notice in UI. |
| Qwen3-0.6B ONNX build unusable | Fall back to Qwen2.5-0.5B-Instruct (pre-flight decides). |
| Claude Code transcript schema drift | Pin harvester to current format; store the raw transcript alongside the derived `StoryRun`. |
| Tiny model too incoherent for the live function-call demo | Fall back to plain-text generation + explanation (still real, still labeled). |
| Model download weight (~300–500 MB) | Load only on deepest-zoom opt-in; cache; show progress; never blocks the rest of the journey. |

---

## 9. Decomposition into implementation plans

This is two coupled subsystems; split like v1's A/B (which worked well):

- **Plan C1 — Data & backstage.** Pre-flight model spike (§7); data model v2 Zod schemas (§6.3); the Claude Code session → `StoryRun` harvester (§6.4); capture the 3 real scenarios (incl. the buggy-repo fixture for the hero); one-time Qwen3-0.6B recorded-token fallback capture; update `recording-notes.md`.
- **Plan C2 — Frontend zoom experience.** ZoomStage engine (§6.1); Structure Y navigation (pan + zoom + indicator); per-beat micro views (the L1/L2/L3 content for each concept); TokenMicroscope integration + fallback (§6.2); whiteboard visuals (reuse); i18n (extend); example switcher; deploy config.

C1 defines and produces the data; C2 consumes it. Build the pre-flight spike + C1 schemas first.

---

## 10. Success criteria

- A non-technical viewer can, in one pass, articulate the chain: *you type → split into tokens → model scores the next token → sampling picks one → the picked tokens happen to form a command → your runtime executes it → the result feeds back → loop → that's an agent.*
- At any "model speaks" beat, the viewer can zoom to a **live, real** token distribution running on their own machine and resample it.
- Every datum is real and sourced; anything illustrative or fallback is labeled.
- The whiteboard aesthetic of v1 is preserved.
- Deploys as a static site with zero server compute.
