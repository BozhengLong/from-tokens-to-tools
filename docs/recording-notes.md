# Recording Notes

This document is the public record of how the `src/data/examples/*` JSON files were produced. It exists to make the demo's "100% real model output" claim auditable.

## Source of truth

- **Model:** `gpt-4.1` (via the OpenAI-compatible endpoint configured by `OPENAI_BASE_URL`)
- **Tokenizer:** `cl100k_base` (via `tiktoken`)
- **Seed:** 42 (set for all scripts except `sampling.ts`)
- **Temperature:** 1.0 (overridden per sampling-path in `sampling.ts`)
- **`parallel_tool_calls`**: false
- **`stream`**: false

## Data integrity rules

1. Model output (`reasoning`, `logprobs`, `tool_call`, `iterations`) is 100% real — copied from OpenAI's response without edits. To shorten output, re-record; do not edit JSON by hand.
2. Tool execution is real code in `src/tools/*.ts` against either an in-memory FS (downloads-bigfiles) or the live public APIs (open-meteo, Wikipedia, HN).
3. Truncation is allowed (≤ 500 chars for reasoning, ≤ 2000 for tool observations) via `slice(0, n)` + ellipsis. Mid-string deletion is forbidden. Truncated observations are wrapped as `{ _truncated: true, originalLength, preview }`.
4. zh and en are recorded as separate runs; their iteration counts and tool sequences may differ. This is intentional and is itself a teaching point (language conditioning affects agent behavior).
5. Only one transformation happens in the browser: Station 3's temperature slider re-softmaxes the captured top-20 logprobs in-browser. This is math, not a fake; the slider only affects the visible top-20 distribution.

## The 5 recording scripts (run per example × per language)

| Script | Produces | Calls model? |
|---|---|---|
| `tokenize.ts` | `tokenize.<lang>.json` | no (tiktoken local) |
| `logits.ts` | `logits.<lang>.json` | yes (1 call, plain-text mode, logprobs+top_logprobs=20) |
| `sampling.ts` | `sampling.<lang>.json` | yes (4 calls at greedy / low-temp / top-p / high-temp; reads `logits.<lang>.json` first) |
| `function-calls.ts` | `function-calls.<lang>.json` | yes (1 call, tools mode, logprobs, first-call only) |
| `agent-loops.ts` | `topology.<lang>.json` | yes (reactive loop + deliberative loop) |

Ordering matters: `sampling.ts` depends on `logits.<lang>.json`; `agent-loops.ts` cross-checks against `function-calls.<lang>.json`. The CLI (`index.ts`) runs them in the correct order.

## ReAct format contract

The model is instructed (system prompt in `agent-runner.ts`) to print a single `Thought: <…>` line before each tool call, then call the tool via the function-calling protocol. `agent-runner.ts` parses the `Thought:` line out of `message.content`. OpenAI tool use has no native "thought" field, so this prompt-enforced convention is how we capture reasoning.

## Termination conditions (agent loop)

A loop ends when, whichever comes first:
1. The model returns a text-only response (no `tool_calls`) → `terminationReason: 'text-final'` (the final text is stored in `finalText`).
2. The model calls a manifest-declared `finalActionTools` entry → `terminationReason: 'final-action-called'`.
3. `MAX_ITERATIONS` (10) is reached → `terminationReason: 'max-iter'`. **This is a recording-failure signal** — the recording scripts throw on it; tighten the prompt and re-record.

## Station 4 ↔ Station 5 consistency

`function-calls.ts` and `agent-loops.ts` (reactive) use the same system prompt + same seed, so the first tool call must match. `agent-loops.ts` asserts this and fails loudly if they diverge — this guarantees the call shown in Station 4 is the call executed in Station 5.

## What to do if recording is unstable

- `max-iter` termination: prompt is too vague; tighten the system prompt or task prompt.
- Consistency check failure (`function-calls.ts` first call ≠ `agent-loops.ts` reactive[0]): seed reproducibility broke; check if model version changed or seed config drifted.
- Wikipedia `missingtitle`: article title in manifest is wrong; verify the exact title on Wikipedia.
- Deliberative "no numbered plan parsed": the model didn't emit a `1. 2. 3.` plan; strengthen the deliberative prompt.

## Re-recording

Re-recording is a deliberate one-time act, not a CI step. Run `npm run record -- --example=<id>` (optionally `--lang=zh|en`) after verifying the manifest is correct. Recording reads `OPENAI_API_KEY` + `OPENAI_BASE_URL` from `.env` (gitignored).

## Mock side effects in Node

During recording, `send_notification` / `save_tweet_draft` / `save_recommendation` go through the Node `ToolContext` (`node-context.ts`), which only logs to stdout and uses an in-memory Map. The observations they return are still real (produced by real tool code). The runtime browser version triggers real side effects (Notification API, clipboard, localStorage).

---

## v2 "zoomable journey" — pre-flight findings (2026-05-30)

The v2 redesign (spec `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-v2-zoom-design.md`) sources data from two real places: the **agent story** from a real Claude Code session transcript, and the **deepest token-microscope layer** from a tiny open model. The token-microscope path was de-risked by a browser spike. Findings (these correct several assumptions in the spec — propagated there):

- **Browsers in CN cannot reach huggingface.co** (raw `fetch` → `Failed to fetch`; CORS + reachability). `hf-mirror.com` from the browser is likewise CORS-blocked. **node, however, reaches `hf-mirror.com` fine (status 200).**
- **Decision: self-host the model weights, served same-origin** — NOT loaded from the HF CDN at runtime. Download once via node from hf-mirror (`scripts/v2/prefetch-model.ts` → `scripts/v2/models/<id>/`, gitignored), serve from our own origin; the browser loads with `env.allowRemoteModels=false; env.allowLocalModels=true; env.localModelPath`. Same origin ⇒ no CORS. This also makes the deployed demo work in CN (no third-party model host at runtime; weights ship with / are hosted alongside the app).
- **Model: `HuggingFaceTB/SmolLM2-135M-Instruct`, dtype `q4`, ~178 MB.** (Qwen2.5-0.5B q4 was ~500 MB — rejected as too heavy; `onnx-community/Qwen3-0.6B` had no reachable ONNX build, 401.) SmolLM2's smaller vocab (49,152) keeps the download light. Verified in-browser via WebGPU: load ~750 ms, single forward ~133 ms, real logits (`The capital of France is` → top ` the` 18.27, ` Paris` 17.75).
- **Read logits from the flat buffer**, not `Tensor.slice().tolist()` (slice collapses dims in this transformers.js version). Use `logits.data` (Float32Array) + dims: last row = indices `[(seq-1)*vocab, seq*vocab)`.
- **The live model is OPT-IN.** Default deepest-layer experience = pre-recorded real token data (tiny JSON, instant, CN-safe, works on any device); the live SmolLM2 model loads only behind an explicit "load live model" button (~178 MB, browser-cached) for users who want to type + resample live. Non-WebGPU devices always get the recorded path.
- **Integrity:** the live path is real-time real computation; the recorded path is captured once from the **same** model (SmolLM2-135M) via node. Both are real. The UI labels which is in use, and labels the **source handoff**: the agent story is Claude Code, the token microscope is SmolLM2 (shown because Anthropic's API exposes no logprobs).

### v2 data foundation (Plan C1, complete)

How each scenario's data is produced and how to re-create it:

- **`src/data/v2/<scenario>/story.json`** — the curated, **bilingual** (zh/en inline) `StoryRun` (schema in `src/types/v2-schemas.ts`). Authored by hand from the harvested raw beats. There is ONE `story.json` per scenario (not separate zh/en files — the schema embeds both languages). Real captured `thought`/`observation`/`seedContext` stay single-language; only the teaching text (title/summary/zoom/bridge) is bilingual.
- **`raw-transcript.jsonl`** — the real Claude Code session (provenance). To capture a new one: run a real Claude Code session on the scenario's sandbox (extended thinking ON), then copy its `~/.claude/projects/<encoded-path>/<session>.jsonl`.
- **Harvest:** `scripts/v2/harvest.ts` (`harvestTranscript`) turns a transcript into ordered raw beats (drops noise events; handles string-or-array content; attaches narration to each tool call). Curation (selecting/trimming beats, writing the bilingual zoom L1/L2/L3) is a manual pass on top.
- **`token-fallback.json`** — real SmolLM2-135M top-k token data for the "model-speaks" beats, produced by `scripts/v2/capture-token-fallback.ts` (node, via hf-mirror, reusing the `scripts/v2/models` cache). Its `BEATS` seeds MUST match each beat's `zoom.seedContext` in `story.json`. Greedy decode for a stable recording; the distribution is real (the 135M model's greedy *path* is imperfect, which is honest).
- **Validate:** `npx tsx scripts/v2/validate-v2.ts` — Zod-validates every `story.json` + `token-fallback.json` and checks each `tokenFallbackRef` resolves.
- The hero scenario (`fix-failing-test`) is done end-to-end. The other two (`clean-big-files`, `error-recovery`) reuse this exact flow and are produced during Plan C2's scale phase.
