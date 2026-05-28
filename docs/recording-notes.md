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
