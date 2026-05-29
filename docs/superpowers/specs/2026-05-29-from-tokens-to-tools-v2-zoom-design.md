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

### 2.1 Controls (honoring "no scroll, gated steps")

- **Pan = explicit Next / Back** (buttons + ← → keys). Deliberate, gated — *not* free scroll. You advance when you choose to.
- **Zoom = click a "zoom in" affordance on a beat** (and pinch on touch; optional scroll-to-zoom on desktop). Zoom out = a persistent "↑ back to map" control. A breadcrumb always shows **`beat i / N` + `depth L0–L3`** so you never feel lost.

### 2.2 The guided first descent (so the core lesson is never skipped by accident)

A viewer who only ever *pans* would see the story but never the token→command mechanism — which is the whole point. So the **first** "model speaks" beat **actively guides the viewer to zoom in once** (a pulsing "↓ look inside" cue, and the Next button is gently de-emphasized until they've descended at least once). After that first whole→part→whole loop, zooming is fully optional and self-paced. This guarantees every viewer experiences the macro↔micro move at least once.

### 2.3 Accessibility & small screens

Semantic zoom is inherently spatial/motion-based, so it needs a non-spatial equivalent:
- **`prefers-reduced-motion`** → transitions become instant cross-fades (no scale animation), zoom still works.
- **Accessible / screen-reader / keyboard-only mode** → the same level tree is also navigable as nested, expandable **disclosure sections** (an outline), so nothing depends on the zoom metaphor alone.
- **Small screens** → pan/zoom degrades to a **stepped accordion** (tap a beat to expand its levels in place) rather than a spatial zoom, preserving the gated story + drill-down without fragile mobile gestures.

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

**Integrity contract (carried over from v1, non-negotiable — see `docs/recording-notes.md`):** model output is 100% real (re-roll, never hand-edit); tools are real code against real sandboxes/APIs; where any value is illustrative, truncated, or unavailable, **the UI says so**. No fabrication anywhere.

**Reconciling "recorded" with "live" (important — these are not in conflict):** v1's rule was "recorded once, replayed deterministically." v2 has *two* real modes, both honest:
- **Replayed-real (Source A):** the agent story is a deterministic replay of a real captured run.
- **Live-real (Source B):** the deepest token layer is *computed live, in front of you,* on a real model. Live real computation is not "faking" — it is, if anything, *more* honest than a recording. The contract is therefore restated as: **every datum is either replayed from a real capture or computed live by a real model; nothing is hand-authored to look real.**

Because the two layers of Structure Y have different data needs, they have two clearly-labeled real sources:

### Source A — a real Claude Code session (the story layer)
The macro story, tool calls, observations, loop, reactive/deliberative behavior, and **real execution results** are harvested from an **actual Claude Code session** transcript (the `.jsonl` session log). For the hero, we run a real Claude Code session against a real small buggy repo and capture it. This is maximally credible — it is a real agent doing real work with real side effects — and costs no external API budget.

*Why not also get the token internals here?* The Anthropic API exposes **no logprobs** to any client (not a Claude Code limitation — the upstream simply doesn't offer them). Codex's reasoning-model path doesn't expose them either. So the deepest layer needs a different, fully-inspectable source.

### Source B — a tiny open model in the viewer's browser (the deepest token layer)
> **Pre-flight outcome (2026-05-30, see `docs/recording-notes.md`):** confirmed viable. Model = **`HuggingFaceTB/SmolLM2-135M-Instruct` (q4, ~178 MB)**, **self-hosted same-origin** — NOT the HF CDN (browsers in CN can't reach huggingface.co; we download once via node from `hf-mirror.com` and serve the weights ourselves). Verified in-browser via WebGPU: ~750 ms load, ~133 ms forward, real logits.

The bottom-most "this is just next-token prediction" layer is powered by a **tiny open model — SmolLM2-135M-Instruct — running locally in the viewer's browser** via **transformers.js + WebGPU**, lazily loaded only when the user opts in at the deepest zoom. transformers.js is chosen over WebLLM specifically because it exposes the **raw logits + tokenizer** — exactly what we are trying to show. (135M is plenty: this layer demonstrates the *mechanism*; the model's smarts don't matter, its transparency does.)

This makes the deepest zoom **live and interactive**: the viewer can type a snippet and watch real tokenization → the real next-token probability distribution → real sampling, and drag a temperature slider to **resample for real**. It runs entirely on the viewer's own device; no server, no API, ever.

**Seed it with the real context (tightens the connection).** When the viewer drills into a specific "model speaks" beat, the microscope is **pre-loaded with the real context from that exact moment** (the prompt/conversation Claude actually had at that beat). So instead of an arbitrary toy, the learner sees *"given exactly what the agent saw here, here's what next-token prediction looks like on a model we can see inside."* The viewer can then edit it freely.

**The source handoff must be explicit and honest (this is a named design requirement, not a footnote).** The viewer arrives at the deep layer from a *Claude* beat but the microscope is *Qwen3*. The zoom boundary must visibly mark this handoff — e.g. a framed transition: *"Claude won't show us its probabilities (Anthropic's API doesn't expose them). So to see what next-token prediction actually looks like, here's a small open model running on your machine — same mechanism, fully inspectable."* The UI must never let the viewer believe they are watching Claude's internals. This labeling is a build-acceptance criterion, not optional polish.

**Default = recorded; live = opt-in (decided 2026-05-30).** The deepest layer's DEFAULT is **pre-recorded real token data** (captured once from the same SmolLM2-135M via node — tiny JSON, instant, CN-safe, works on any device). The live model loads only behind an explicit "load live model (~178 MB)" button, and only on WebGPU-capable devices. The same `TokenMicroscope` interface backs both; both are real. (This refines the earlier framing: recorded is the baseline everyone gets; live is the enthusiast enhancement — chosen so no one is forced to download ~178 MB, important for the CN/mobile audience.)

**Fallback (whole feature):** if the pre-flight (§7) shows the in-browser model is not viable at all, the deepest layer ships **recorded-only** for everyone (the option-② path). This still meets every success criterion in §10 — it loses live resampling, not the lesson. The live capability is an enhancement gated on the pre-flight, never a hard dependency of the project.

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

**Stack unchanged:** React 19, Vite 8, Tailwind v4 (CSS-first `@theme`), Zustand 5, Zod 4, framer-motion. Reuse v1's whiteboard primitives, i18n infra, store pattern, Zod-as-source-of-truth, and the `recording-notes.md` integrity rules.

*Retired from v1:* the custom tool layer (`list_directory`, `get_weather`, …) and the in-memory FS are **not** used in v2 — observations now come from a real Claude Code session's real tools, captured in the transcript and replayed. There is no live tool execution at runtime in v2; the only live computation is the token microscope (§4 Source B).

**New core units:**

1. **ZoomStage engine** — the semantic-zoom primitive. Holds, per beat, a stack of authored zoom levels; animates scale + crossfade between levels; tracks `(panIndex, zoomDepth)`; renders a persistent "you are here + how deep" indicator; supports click / keyboard / scroll-to-zoom and `prefers-reduced-motion`. One focused, independently testable component with a clear interface (`levels`, current depth, callbacks).
2. **TokenMicroscope** — wraps transformers.js + **SmolLM2-135M-Instruct (q4)** loaded **same-origin** via WebGPU. Lazy-loaded, opt-in. API: `tokenize(text)`, `nextTokenTopK(context, k) → {token, id, logprob}[]` (top-k from real logits — read from the flat `logits.data` buffer + dims, NOT `slice().tolist()`, which collapses dims in this transformers.js version), `generateSteps(context, n, temperature)`. Live temperature slider re-samples for real. WebGPU detection; recorded-data backend behind the same interface is the default.
3. **Data model v2 (Zod schemas)** — `StoryRun = { meta, beats: Beat[], topology }`; `Beat = { kind: 'user' | 'model-speaks' | 'runtime-acts' | 'final', thought?, toolCall?, observation?, zoom?: ZoomContent }`; `ZoomContent` holds the authored per-beat L1/L2/L3 material (plain-language text, callouts, curiosity bridge) plus, for "model speaks" beats, the real seed-context for the live microscope and the recorded token-fallback slice. `StoryRun` is the new canonical shape; v1's `AgentLoopData`/`TopologyData` are reused only as the sub-structure for the loop-iteration list and the reactive/deliberative toggle.
4. **Recorder v2 + curation.** Two distinct activities, do not conflate them:
   - *Harvest (mechanical):* parse a real Claude Code session transcript (`.jsonl`) — user/assistant messages, `tool_use` blocks (the real function calls), `tool_result` blocks (the real observations), thinking blocks — into raw beats. (Run the capture session with **extended thinking ON** so each beat has visible reasoning to teach with; otherwise tool-call beats have no "thought".)
   - *Curate + author (design work — the bulk of the effort):* a real session is messy (dozens of calls, huge outputs, system noise). A human/LLM pass **selects the teachable beats, trims observations, and writes the L1/L2/L3 zoom content** for each beat (the plain-language explanation, the "what to look at" callouts, the curiosity bridge to the next beat), in zh + en. This authored layer — not the transcript dump — is what makes it teach. Budget for it as the largest piece of C1, not an afterthought.
   - Plus: the buggy-repo fixture for the hero, and a one-time Qwen3-0.6B capture producing the recorded token fallback (§4 Source B fallback).

**Deploy:** static build on Vercel **or** GitHub Pages. **Zero server compute** — the (opt-in) model runs in the viewer's browser. Model weights are **self-hosted same-origin** (downloaded once via node from hf-mirror by `scripts/v2/prefetch-model.ts`; ~178 MB), NOT fetched from the HF CDN at runtime — browsers in CN can't reach HF. Host the weights on the same origin as the app (or a CN-accessible static host/CDN); they load only when a user opts into the live microscope. WebGPU required for live; otherwise the recorded data (default) is served.

**What is replaced:** v1's scroll narrative, the 7 fixed station components, and the per-station data files (`tokenize/logits/sampling/function-calls/topology.json`) are superseded by `StoryRun` + zoom layers. v1 remains at tag `plan-b-complete`.

---

## 7. Pre-flight verification (MUST pass before frontend build)

> **✅ DONE (2026-05-30) — outcome in `docs/recording-notes.md`:** live viable with self-hosted `HuggingFaceTB/SmolLM2-135M-Instruct` (q4, ~178 MB) loaded same-origin via WebGPU. The original Qwen3-0.6B target was dropped (no reachable ONNX build; Qwen2.5-0.5B was ~500 MB — too big). The real blocker was browser CORS to HF, solved by self-hosting the weights (download via node from hf-mirror → serve same-origin). The notes below are the original spike spec, retained for provenance.

A spike, before committing to the frontend, mirroring v1's "probe logprobs first" discipline:

- In a blank Vite page, load **`onnx-community/Qwen3-0.6B` (transformers.js-compatible ONNX build)** via WebGPU and confirm we can: (a) load it; (b) tokenize text; (c) **read the raw `logits` tensor from a single forward pass** (not just `generate()` text — we specifically need the distribution over the next token, which is the whole point); (d) compute top-k probabilities via softmax; (e) sample from them; (f) feed it a custom multi-token context and read the distribution at the final position; (g) acceptable download size + first-load time on a mid-range laptop.
- Disable Qwen3 "thinking" mode for the demo (we want plain next-token generation to show the distribution).
- **Fallback if blocked:** if a usable Qwen3-0.6B ONNX/WebGPU build is unavailable or too heavy, drop to **Qwen2.5-0.5B-Instruct** (known transformers.js-compatible). If WebGPU/logits access fails entirely, trigger the §4 whole-feature recorded-only fallback. Document whichever path is taken.

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
| **Scope creep** — v2 is materially bigger than v1 (custom zoom engine + in-browser ML + transcript harvest + authored curation × 3 scenarios × 2 langs). | **Build the hero scenario as a full vertical slice first** (§9), end-to-end, before the other two. Validates the whole pipeline cheaply; the other scenarios then reuse proven machinery. |
| **Source-handoff confusion** (viewer thinks Qwen internals = Claude internals). | Explicit framed handoff at the zoom boundary is a build-acceptance criterion (§4). |
| Zoom metaphor inaccessible (reduced-motion, screen-reader, mobile). | Disclosure-outline mode + stepped accordion on small screens (§2.3) — nothing depends on the spatial metaphor alone. |

---

## 9. Decomposition into implementation plans

This is two coupled subsystems; split like v1's A/B (which worked well):

- **Plan C1 — Data & backstage.** Pre-flight model spike (§7); data model v2 Zod schemas (§6.3); the Claude Code session → `StoryRun` harvester (§6.4); capture the 3 real scenarios (incl. the buggy-repo fixture for the hero); one-time Qwen3-0.6B recorded-token fallback capture; update `recording-notes.md`.
- **Plan C2 — Frontend zoom experience.** ZoomStage engine (§6.1); Structure Y navigation (pan + zoom + indicator); per-beat micro views (the L1/L2/L3 content for each concept); TokenMicroscope integration + fallback (§6.2); whiteboard visuals (reuse); i18n (extend); example switcher; deploy config.

C1 defines and produces the data; C2 consumes it.

**Build order — vertical slice first (de-risks the scope):**
1. **Pre-flight spike** (§7) — prove the in-browser model + logits, or fall to recorded-only.
2. **Hero end-to-end slice** — data model v2 schemas → harvest+curate *only* the "fix a failing test" run → ZoomStage + TokenMicroscope → the full hero journey working, deployed. This proves every moving part on one scenario.
3. **Replicate** the proven pipeline for 🟢 clean-big-files and 🌤 error-recovery (mostly capture + curation, little new engineering).
4. **Polish**: i18n completeness, accessibility/mobile modes, deploy hardening.

So C1 and C2 interleave around the hero slice rather than running as two strict sequential phases; writing-plans will encode this ordering.

---

## 10. Success criteria

- A non-technical viewer, following the natural path (which **guarantees one guided descent**, §2.2), can articulate the chain: *you type → split into tokens → model scores the next token → sampling picks one → the picked tokens happen to form a command → your runtime executes it → the result feeds back → loop → that's an agent.*
- At any "model speaks" beat, the viewer can zoom to a **live, real** token distribution running on their own machine and resample it — *or*, where the device/pre-flight can't support live inference, a clearly-labeled recorded-real equivalent (the lesson survives either way).
- Every datum is real and sourced (replayed-real or live-real); anything illustrative or fallback is labeled; the Claude→Qwen source handoff is explicit.
- The experience is navigable without the zoom metaphor (reduced-motion / keyboard / small-screen modes).
- The whiteboard aesthetic of v1 is preserved.
- Deploys as a static site with zero server compute.
