# Plan C1: v2 Data Foundation & Backstage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, with verified feasibility, the real data + reusable model module the v2 "zoomable journey" frontend will consume: prove (or rule out) the in-browser token model, define the v2 data model, build the Claude Code transcript harvester, and capture + curate the hero "fix a failing test" `StoryRun` plus its recorded token fallback.

**Architecture:** A throwaway pre-flight spike validates transformers.js + Qwen3-0.6B + WebGPU + raw-logits access in a real browser; its outcome decides live-vs-recorded and graduates into a `TokenMicroscope` module with two interchangeable backends (live + recorded) behind one interface. Zod schemas define `StoryRun`/`Beat`/`ZoomContent` as the single source of truth. A harvester parses a real Claude Code session `.jsonl` into raw beats; a curation pass authors the bilingual zoom content and validates it.

**Tech Stack:** TypeScript ~6 (strict, `verbatimModuleSyntax`), Zod 4, vitest 4, `@huggingface/transformers` (transformers.js v3), tsx scripts, Vite 8. Reuses v1's `src/utils/sampling.ts` (`softmaxFromLogprobs`, `applyTemperature`) and `src/types/schemas.ts` (`BilingualSchema`).

**Reference:** Design spec `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-v2-zoom-design.md`. v1 is complete at tag `plan-b-complete`. Frontend is Plan C2, written AFTER this plan's pre-flight (Task 1) confirms the model path.

**Conventions (carried from v1):**
- Strict TS: use `import type` for type-only imports; no unused locals.
- Tests: vitest, `include: ['src/**/*.test.ts']`, env `node`. DOM/browser-only behavior is NOT unit-tested in node — it's manually verified in a browser (the spike, the live backend).
- Commit trailer on EVERY commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (own line, via HEREDOC `-F -`). No `-c commit.gpgsign=false`.
- Never commit `.env` or scratch files. Work from `~/workspace/from-tokens-to-tools`.

---

## File Structure

```
scripts/v2/
├── spike/                         # Task 1 — throwaway pre-flight (deleted after)
│   ├── spike.html
│   └── spike.ts
├── harvest.ts                     # Task 7 — CC transcript .jsonl -> raw beats
├── harvest.test.ts                # Task 7
├── fixtures/
│   └── sample-transcript.jsonl    # Task 7 — trimmed real CC transcript for tests
├── capture-token-fallback.ts      # Task 6 — node script: Qwen -> recorded token data
└── validate-v2.ts                 # Task 9 — Zod-validate all v2 data files
src/types/
├── v2-schemas.ts                  # Task 2 — StoryRun / Beat / ZoomContent (Zod)
└── v2-schemas.test.ts             # Task 2
src/microscope/
├── types.ts                       # Task 4 — TokenMicroscope interface + TokenDist
├── dist.ts                        # Task 3 — topKFromLogits, sampleIndex (pure)
├── dist.test.ts                   # Task 3
├── recorded.ts                    # Task 4 — recorded-fallback backend
├── recorded.test.ts               # Task 4
└── live.ts                        # Task 5 — transformers.js/WebGPU backend (browser)
src/data/v2/fix-failing-test/
├── story.zh.json                  # Task 8/9 — curated hero StoryRun (zh)
├── story.en.json                  # Task 8/9 — curated hero StoryRun (en)
├── token-fallback.json            # Task 6 — recorded Qwen token data
└── raw-transcript.jsonl           # Task 8 — the real captured session (provenance)
sandboxes/fix-failing-test/        # Task 8 — the buggy repo the hero session fixes
docs/recording-notes.md            # Task 1 & Task 10 — append v2 findings
package.json                       # Task 1 — add @huggingface/transformers devDep
```

---

## Phase 0 — Pre-flight (the gate)

### Task 1: Pre-flight spike — can Qwen3-0.6B give us real logits in the browser?

This is a **spike**, not TDD: WebGPU is unavailable in node/vitest, so this is verified **manually in a real browser**. The deliverable is a recorded decision, not a passing test.

**Files:**
- Create: `scripts/v2/spike/spike.html`, `scripts/v2/spike/spike.ts`
- Modify: `package.json` (add dep), `docs/recording-notes.md` (append outcome)

- [ ] **Step 1: Install transformers.js**

```bash
cd ~/workspace/from-tokens-to-tools
npm install @huggingface/transformers
```
Expected: installs (v3.x). If peer-dep warnings about onnxruntime appear, they are fine.

- [ ] **Step 2: Write the spike page `scripts/v2/spike/spike.html`**

```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>v2 model spike</title></head>
  <body>
    <h1>Token microscope pre-flight</h1>
    <pre id="out">running… open the console.</pre>
    <script type="module" src="./spike.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Write the spike `scripts/v2/spike/spike.ts`**

This is best-effort against transformers.js v3. The exact tensor accessors (`.tolist()` / `.data`) may differ slightly by version — the engineer must confirm against the installed version's types and adapt, but the SHAPE of the result (a vocab-length logits row → top-k `{token,id,logprob}`) is the contract.

```ts
import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';

const out = document.getElementById('out')!;
const log = (m: string) => { out.textContent += `\n${m}`; console.log(m); };

// Try Qwen3-0.6B first; fall back to Qwen2.5-0.5B-Instruct if it fails to load.
const CANDIDATES = ['onnx-community/Qwen3-0.6B', 'onnx-community/Qwen2.5-0.5B-Instruct'];

async function run() {
  env.allowRemoteModels = true; // pull from HF CDN
  for (const id of CANDIDATES) {
    try {
      log(`loading ${id} …`);
      const t0 = performance.now();
      const tokenizer = await AutoTokenizer.from_pretrained(id);
      const model = await AutoModelForCausalLM.from_pretrained(id, { device: 'webgpu', dtype: 'q4' });
      log(`loaded in ${Math.round(performance.now() - t0)}ms`);

      const prompt = 'The capital of France is';
      const inputs = await tokenizer(prompt);
      log(`tokenized -> ${inputs.input_ids.dims} ids`);

      // Single forward pass; read raw logits for the LAST position.
      const { logits } = await model(inputs);            // dims [1, seq, vocab]
      const seqLen = logits.dims[1];
      const lastRow = logits.slice(0, seqLen - 1, null); // [1,1,vocab]
      const arr: number[] = Array.from((await lastRow.tolist())[0][0]); // vocab-length logits

      // top-k by logit
      const idx = arr.map((v, i) => [v, i] as [number, number])
        .sort((a, b) => b[0] - a[0]).slice(0, 10);
      const top = idx.map(([v, i]) => ({ token: tokenizer.decode([i]), id: i, logit: v }));
      log(`top-10 next tokens: ${JSON.stringify(top, null, 2)}`);
      log(`✅ SUCCESS with ${id}: tokenization + raw logits + top-k all work.`);
      return;
    } catch (e) {
      log(`❌ ${id} failed: ${String(e)}`);
    }
  }
  log('❌ ALL candidates failed → trigger whole-feature recorded-only fallback (spec §4).');
}
run();
```

- [ ] **Step 4: Run the spike in a WebGPU browser**

```bash
npx vite scripts/v2/spike --port 5190
```
Open `http://localhost:5190/spike.html` in **Chrome/Edge (WebGPU on)**. Watch the page + console.
Expected: it logs a load time, a tokenization, and a top-10 next-token list whose top token is plausibly " Paris". Note the model that succeeded, the download size (DevTools → Network), and first-load time.

- [ ] **Step 5: Record the decision in `docs/recording-notes.md`**

Append a section `## v2 pre-flight (YYYY-MM-DD)` stating: which model id worked, download size, first-load time, the exact tensor accessor that worked (e.g. `logits.slice(...).tolist()`), and the decision: **LIVE viable** (which model) / **recorded-only fallback**. This is the single source of truth C2 will read.

- [ ] **Step 6: Delete the spike and commit the decision**

```bash
rm -rf scripts/v2/spike
git add package.json package-lock.json docs/recording-notes.md
git commit -F - <<'EOF'
chore(v2): pre-flight — verify in-browser Qwen logits, record decision

Spike confirmed/ruled out transformers.js + WebGPU raw-logit access; outcome
and chosen model recorded in docs/recording-notes.md. Spike page removed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

**If the spike fails entirely:** proceed with the rest of C1 unchanged (the data model and recorded backend are needed either way); only C2's live microscope is dropped in favor of recorded-only. Note it in the commit.

---

## Phase 1 — Data model

### Task 2: v2 Zod schemas (`StoryRun` / `Beat` / `ZoomContent`)

**Files:**
- Create: `src/types/v2-schemas.ts`, `src/types/v2-schemas.test.ts`

- [ ] **Step 1: Write the failing test `src/types/v2-schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { StoryRunSchema, type StoryRun } from './v2-schemas';

const minimal: StoryRun = {
  meta: { scenario: 'fix-failing-test', source: 'claude-code', capturedAt: '2026-05-29' },
  beats: [
    {
      id: 'b0',
      kind: 'user',
      title: { zh: '你说', en: 'You say' },
      summary: { zh: '修一下挂掉的测试', en: 'fix the failing test' },
    },
    {
      id: 'b1',
      kind: 'model-speaks',
      title: { zh: '模型决定跑测试', en: 'Model decides to run tests' },
      summary: { zh: '它先跑测试看现状', en: 'it runs the tests first' },
      toolCall: { name: 'Bash', arguments: { command: 'npm test' } },
      zoom: {
        levels: [
          { level: 1, title: { zh: '它在猜下一个字', en: 'it predicts the next token' }, body: { zh: '…', en: '…' } },
        ],
        seedContext: 'You are fixing a failing test. Decide the next action.',
        tokenFallbackRef: 'token-fallback.json#b1',
      },
      bridge: { zh: '这串文字怎么变成命令?', en: 'how does this text become a command?' },
    },
    {
      id: 'b2',
      kind: 'runtime-acts',
      title: { zh: '运行时真跑', en: 'Runtime runs it' },
      summary: { zh: '红了', en: 'it went red' },
      observation: 'FAIL src/cart.test.js (1 failed, 4 passed)',
      zoom: { levels: [{ level: 1, title: { zh: '不是模型在跑', en: 'not the model' }, body: { zh: '…', en: '…' } }] },
    },
    {
      id: 'b3',
      kind: 'final',
      title: { zh: '绿了', en: 'green' },
      summary: { zh: '收工', en: 'done' },
    },
  ],
  topology: { hasDeliberativeVariant: false },
};

describe('StoryRunSchema', () => {
  it('accepts a well-formed StoryRun', () => {
    expect(() => StoryRunSchema.parse(minimal)).not.toThrow();
  });

  it('rejects an unknown beat kind', () => {
    const bad = structuredClone(minimal);
    // @ts-expect-error intentional
    bad.beats[0].kind = 'nonsense';
    expect(() => StoryRunSchema.parse(bad)).toThrow();
  });

  it('requires bilingual title on every beat', () => {
    const bad = structuredClone(minimal);
    // @ts-expect-error intentional
    delete bad.beats[0].title.en;
    expect(() => StoryRunSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- src/types/v2-schemas.test.ts` (cannot find module).

- [ ] **Step 3: Implement `src/types/v2-schemas.ts`**

```ts
import { z } from 'zod';
import { BilingualSchema } from './schemas';

// One authored zoom level under a beat (L1..L3). body is the plain-language teaching text.
export const ZoomLevelSchema = z.object({
  level: z.number().int().min(1).max(3),
  title: BilingualSchema,
  body: BilingualSchema,
  // optional "look here" callouts, each pointing at a labeled region of the level
  callouts: z.array(z.object({ label: BilingualSchema, ref: z.string() })).optional(),
});
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

export const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const ZoomContentSchema = z.object({
  levels: z.array(ZoomLevelSchema).min(1),
  // for "model-speaks" beats: the real context to seed the live microscope with
  seedContext: z.string().optional(),
  // pointer into the recorded token-fallback file (e.g. "token-fallback.json#b1")
  tokenFallbackRef: z.string().optional(),
});
export type ZoomContent = z.infer<typeof ZoomContentSchema>;

export const BeatSchema = z.object({
  id: z.string(),
  kind: z.enum(['user', 'model-speaks', 'runtime-acts', 'final']),
  title: BilingualSchema,
  summary: BilingualSchema,
  thought: z.string().optional(),         // model reasoning, when captured
  toolCall: ToolCallSchema.optional(),    // present on model-speaks beats that call a tool
  observation: z.string().optional(),     // present on runtime-acts beats (trimmed real output)
  zoom: ZoomContentSchema.optional(),     // the drill-down material
  bridge: BilingualSchema.optional(),     // the curiosity question leading to the next beat
});
export type Beat = z.infer<typeof BeatSchema>;

export const StoryRunSchema = z.object({
  meta: z.object({
    scenario: z.string(),
    source: z.enum(['claude-code', 'codex']),
    capturedAt: z.string(),
  }),
  beats: z.array(BeatSchema).min(1),
  topology: z.object({
    hasDeliberativeVariant: z.boolean(),
    // when true, a sibling story file holds the deliberative run
    deliberativeRef: z.string().optional(),
  }),
});
export type StoryRun = z.infer<typeof StoryRunSchema>;

// Recorded token-fallback file shape (one entry per "model-speaks" beat id).
export const TokenFallbackSchema = z.record(
  z.string(), // beat id
  z.object({
    model: z.string(),
    prompt: z.string(),
    // ordered generated steps; each step's top-k over the next token
    steps: z.array(z.object({
      chosen: z.string(),
      topK: z.array(z.object({ token: z.string(), id: z.number(), logprob: z.number() })),
    })),
  })
);
export type TokenFallback = z.infer<typeof TokenFallbackSchema>;
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/types/v2-schemas.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/types/v2-schemas.ts src/types/v2-schemas.test.ts
git commit -F - <<'EOF'
feat(v2): add StoryRun/Beat/ZoomContent Zod schemas (data model v2)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 2 — TokenMicroscope module

### Task 3: Pure distribution helpers (`topKFromLogits`, `sampleIndex`)

Reuses v1's `softmaxFromLogprobs`/`applyTemperature` (in `src/utils/sampling.ts`); adds the two helpers the microscope needs on top.

**Files:**
- Create: `src/microscope/dist.ts`, `src/microscope/dist.test.ts`

- [ ] **Step 1: Write the failing test `src/microscope/dist.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { topKFromLogits, sampleIndex } from './dist';

describe('topKFromLogits', () => {
  it('returns the k highest-logit indices, descending', () => {
    const logits = [0.1, 5.0, -2.0, 3.0];
    const top = topKFromLogits(logits, 2);
    expect(top.map((t) => t.id)).toEqual([1, 3]);
    expect(top[0]!.logprob).toBeGreaterThan(top[1]!.logprob);
  });

  it('logprobs are log-softmax (negative, exp-sums-to≤1 over full set)', () => {
    const logits = [0, 0, 0, 0];
    const top = topKFromLogits(logits, 4);
    // uniform over 4 -> each prob 0.25 -> logprob ln(0.25)
    top.forEach((t) => expect(Math.exp(t.logprob)).toBeCloseTo(0.25, 5));
  });
});

describe('sampleIndex', () => {
  it('temperature 0 always returns the argmax', () => {
    const probs = [0.1, 0.7, 0.2];
    for (let i = 0; i < 20; i++) expect(sampleIndex(probs, 0, () => Math.random())).toBe(1);
  });

  it('uses the injected RNG to pick by cumulative probability', () => {
    const probs = [0.2, 0.3, 0.5];
    expect(sampleIndex(probs, 1, () => 0.0)).toBe(0);   // first bucket
    expect(sampleIndex(probs, 1, () => 0.25)).toBe(1);  // into second
    expect(sampleIndex(probs, 1, () => 0.99)).toBe(2);  // last
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- src/microscope/dist.test.ts`

- [ ] **Step 3: Implement `src/microscope/dist.ts`**

```ts
// Relative (not '@/...') import: this module is imported by a tsx node script
// (Task 6) which does NOT resolve the '@' vite alias. Relative works everywhere.
import { softmaxFromLogprobs } from '../utils/sampling';

export type TokenProb = { token: string; id: number; logprob: number };

// Full-vocab logits -> the k most likely next tokens, with true log-softmax logprobs.
// `decode` maps a token id to its display string (injected so this stays pure/testable).
export function topKFromLogits(
  logits: number[],
  k: number,
  decode: (id: number) => string = (id) => String(id)
): TokenProb[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const logZ = Math.log(sum) + max; // log-sum-exp
  return logits
    .map((l, id) => ({ token: decode(id), id, logprob: l - logZ }))
    .sort((a, b) => b.logprob - a.logprob)
    .slice(0, k);
}

// Sample an index from a probability array. temperature<=0 => argmax. rng() in [0,1).
export function sampleIndex(probs: number[], temperature: number, rng: () => number): number {
  if (temperature <= 0) return probs.indexOf(Math.max(...probs));
  // re-weight by temperature, then inverse-CDF sample
  const reweighted = softmaxFromLogprobs(probs.map((p) => Math.log(Math.max(p, 1e-12)) / temperature));
  const r = rng();
  let acc = 0;
  for (let i = 0; i < reweighted.length; i++) {
    acc += reweighted[i]!;
    if (r < acc) return i;
  }
  return reweighted.length - 1;
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/microscope/dist.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/microscope/dist.ts src/microscope/dist.test.ts
git commit -F - <<'EOF'
feat(v2): add token-distribution helpers (topKFromLogits, sampleIndex)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: `TokenMicroscope` interface + recorded backend

The recorded backend replays the captured token-fallback data and is fully node-testable. The live backend (Task 5) implements the same interface.

**Files:**
- Create: `src/microscope/types.ts`, `src/microscope/recorded.ts`, `src/microscope/recorded.test.ts`

- [ ] **Step 1: Implement the interface `src/microscope/types.ts`** (no test — it's a type)

```ts
import type { TokenProb } from './dist';

export type TokenizedPiece = { text: string; id: number };

// One generation step exposed to the UI: the distribution + which token was taken.
export type MicroscopeStep = { chosen: TokenProb; topK: TokenProb[] };

export interface TokenMicroscope {
  // split text into tokens with ids (for the "AI reads numbers" view)
  tokenize(text: string): Promise<TokenizedPiece[]>;
  // the next-token distribution given a context (top-k)
  nextTokenTopK(context: string, k: number): Promise<TokenProb[]>;
  // generate n steps from context, recording the distribution at each (for replay/scrub)
  generateSteps(context: string, n: number, temperature: number): Promise<MicroscopeStep[]>;
  readonly kind: 'live' | 'recorded';
}
```

- [ ] **Step 2: Write the failing test `src/microscope/recorded.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RecordedMicroscope } from './recorded';
import type { TokenFallback } from '@/types/v2-schemas';

const fixture: TokenFallback = {
  b1: {
    model: 'qwen3-0.6b',
    prompt: 'You are fixing a failing test. Next action:',
    steps: [
      { chosen: 'run', topK: [
        { token: 'run', id: 6108, logprob: -0.04 },
        { token: 'check', id: 999, logprob: -3.2 },
      ] },
      { chosen: '_tests', topK: [{ token: '_tests', id: 7, logprob: -0.5 }] },
    ],
  },
};

describe('RecordedMicroscope', () => {
  it('replays the recorded steps for a beat', async () => {
    const m = new RecordedMicroscope(fixture, 'b1');
    const steps = await m.generateSteps('ignored', 2, 1);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.chosen.token).toBe('run');
    expect(steps[0]!.topK[0]!.token).toBe('run');
    expect(m.kind).toBe('recorded');
  });

  it('nextTokenTopK returns the first step distribution', async () => {
    const m = new RecordedMicroscope(fixture, 'b1');
    const top = await m.nextTokenTopK('ignored', 5);
    expect(top[0]!.token).toBe('run');
  });

  it('throws for an unknown beat id', () => {
    expect(() => new RecordedMicroscope(fixture, 'nope')).toThrow();
  });
});
```

- [ ] **Step 3: Run, verify FAIL** — `npm test -- src/microscope/recorded.test.ts`

- [ ] **Step 4: Implement `src/microscope/recorded.ts`**

```ts
import type { TokenMicroscope, MicroscopeStep, TokenizedPiece } from './types';
import type { TokenFallback } from '@/types/v2-schemas';

// Replays pre-recorded token data for one beat. Used when WebGPU/live is unavailable.
// `context`/`temperature` are ignored (it's a recording) — the UI still shows the real
// distribution; only live re-sampling is unavailable in this mode.
export class RecordedMicroscope implements TokenMicroscope {
  readonly kind = 'recorded' as const;
  private readonly entry: TokenFallback[string];

  constructor(data: TokenFallback, beatId: string) {
    const entry = data[beatId];
    if (!entry) throw new Error(`No recorded token data for beat ${beatId}`);
    this.entry = entry;
  }

  async tokenize(text: string): Promise<TokenizedPiece[]> {
    // recorded mode can't tokenize arbitrary input; expose the recorded prompt's pieces
    return this.entry.steps.map((s, i) => ({ text: s.chosen, id: i }));
  }

  async nextTokenTopK(_context: string, k: number) {
    return this.entry.steps[0]!.topK.slice(0, k);
  }

  async generateSteps(_context: string, n: number, _temperature: number): Promise<MicroscopeStep[]> {
    return this.entry.steps.slice(0, n).map((s) => ({
      chosen: s.topK.find((t) => t.token === s.chosen) ?? s.topK[0]!,
      topK: s.topK,
    }));
  }
}
```

- [ ] **Step 5: Run, verify PASS** — `npm test -- src/microscope/recorded.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/microscope/types.ts src/microscope/recorded.ts src/microscope/recorded.test.ts
git commit -F - <<'EOF'
feat(v2): add TokenMicroscope interface + recorded backend

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: Live backend (transformers.js / WebGPU)

Browser-only; **not** node-unit-tested (verified via the spike in Task 1 and manually in C2). Implements the same `TokenMicroscope` interface. Skip the live backend body and ship recorded-only if Task 1 ruled the model out (note it in the commit).

**Files:**
- Create: `src/microscope/live.ts`

- [ ] **Step 1: Implement `src/microscope/live.ts`** (use the model id Task 1 recorded as working)

```ts
import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import type { TokenMicroscope, MicroscopeStep, TokenizedPiece } from './types';
import { topKFromLogits, sampleIndex } from './dist';
import { softmaxFromLogprobs } from '@/utils/sampling';

// Lazily-constructed; call LiveMicroscope.create() (which loads weights from the HF CDN).
export class LiveMicroscope implements TokenMicroscope {
  readonly kind = 'live' as const;
  private constructor(private tokenizer: any, private model: any) {}

  static async create(modelId: string, onProgress?: (p: number) => void): Promise<LiveMicroscope> {
    env.allowRemoteModels = true;
    const tokenizer = await AutoTokenizer.from_pretrained(modelId);
    const model = await AutoModelForCausalLM.from_pretrained(modelId, {
      device: 'webgpu', dtype: 'q4',
      progress_callback: (p: any) => onProgress?.(p?.progress ?? 0),
    });
    return new LiveMicroscope(tokenizer, model);
  }

  async tokenize(text: string): Promise<TokenizedPiece[]> {
    const enc = await this.tokenizer(text);
    const ids: number[] = Array.from(await enc.input_ids.tolist())[0] as number[];
    return ids.map((id) => ({ id, text: this.tokenizer.decode([id]) }));
  }

  private async logitsAt(context: string): Promise<number[]> {
    const inputs = await this.tokenizer(context);
    const { logits } = await this.model(inputs);
    const seqLen = logits.dims[1];
    const lastRow = logits.slice(0, seqLen - 1, null);
    return Array.from((await lastRow.tolist())[0][0]) as number[];
  }

  async nextTokenTopK(context: string, k: number) {
    const logits = await this.logitsAt(context);
    return topKFromLogits(logits, k, (id) => this.tokenizer.decode([id]));
  }

  async generateSteps(context: string, n: number, temperature: number): Promise<MicroscopeStep[]> {
    const steps: MicroscopeStep[] = [];
    let ctx = context;
    for (let i = 0; i < n; i++) {
      const logits = await this.logitsAt(ctx);
      const topK = topKFromLogits(logits, 20, (id) => this.tokenizer.decode([id]));
      const probs = softmaxFromLogprobs(topK.map((t) => t.logprob));
      const pickLocal = sampleIndex(probs, temperature, () => Math.random());
      const chosen = topK[pickLocal]!;
      steps.push({ chosen, topK });
      ctx += chosen.token;
    }
    return steps;
  }
}
```

- [ ] **Step 2: Typecheck (no runtime test in node)**

```bash
npx tsc -b
```
Expected: clean. (The `any` on tokenizer/model is deliberate — transformers.js types are loose; we contain them to this file.)

- [ ] **Step 3: Commit**

```bash
git add src/microscope/live.ts
git commit -F - <<'EOF'
feat(v2): add live TokenMicroscope backend (transformers.js + WebGPU)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: Capture the recorded token fallback (node script)

transformers.js runs in node (CPU/wasm), so we capture the fallback there — no browser needed. This produces real Qwen data for the recorded backend + the non-WebGPU fallback.

**Files:**
- Create: `scripts/v2/capture-token-fallback.ts`
- Output: `src/data/v2/fix-failing-test/token-fallback.json`

- [ ] **Step 1: Implement `scripts/v2/capture-token-fallback.ts`**

```ts
import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import { writeFileSync, mkdirSync } from 'node:fs';
import { topKFromLogits, sampleIndex } from '../../src/microscope/dist.js';
import { softmaxFromLogprobs } from '../../src/utils/sampling.js';

const MODEL = process.env.V2_MODEL ?? 'onnx-community/Qwen2.5-0.5B-Instruct';

// (beatId -> the real seed context for that "model speaks" beat). Filled from the
// curated StoryRun's zoom.seedContext. Edit these to match the captured story.
const BEATS: Record<string, string> = {
  b1: 'You are fixing a failing test in a JS project. The next action is to run the tests. Command:',
};

async function main() {
  env.allowRemoteModels = true;
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL, { dtype: 'q4' });

  const out: Record<string, unknown> = {};
  for (const [beatId, prompt] of Object.entries(BEATS)) {
    let ctx = prompt;
    const steps = [];
    for (let i = 0; i < 8; i++) {
      const inputs = await tokenizer(ctx);
      const { logits } = await model(inputs);
      const seqLen = logits.dims[1];
      const row = Array.from((await logits.slice(0, seqLen - 1, null).tolist())[0][0]) as number[];
      const topK = topKFromLogits(row, 20, (id: number) => tokenizer.decode([id]));
      const probs = softmaxFromLogprobs(topK.map((t) => t.logprob));
      const chosenLocal = sampleIndex(probs, 0, () => 0); // greedy for a stable recording
      const chosen = topK[chosenLocal]!;
      steps.push({ chosen: chosen.token, topK });
      ctx += chosen.token;
    }
    out[beatId] = { model: MODEL, prompt, steps };
  }
  mkdirSync('src/data/v2/fix-failing-test', { recursive: true });
  writeFileSync('src/data/v2/fix-failing-test/token-fallback.json', JSON.stringify(out, null, 2));
  console.log('wrote token-fallback.json');
}
main();
```

- [ ] **Step 2: Run it** (after the hero story exists / seed contexts are known — may be re-run in Task 9)

```bash
V2_MODEL=onnx-community/Qwen2.5-0.5B-Instruct npx tsx scripts/v2/capture-token-fallback.ts
```
Expected: writes `src/data/v2/fix-failing-test/token-fallback.json`; eyeball that `steps[].topK` contains real tokens + logprobs. (Use the model id Task 1 chose; CPU run is slow but fine for ~8 steps.)

- [ ] **Step 3: Commit**

```bash
git add scripts/v2/capture-token-fallback.ts src/data/v2/fix-failing-test/token-fallback.json
git commit -F - <<'EOF'
feat(v2): capture recorded token fallback from local Qwen (node)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 3 — Harvest & curate the hero story

### Task 7: Transcript harvester (`.jsonl` → raw beats)

**Files:**
- Create: `scripts/v2/harvest.ts`, `scripts/v2/harvest.test.ts`, `scripts/v2/fixtures/sample-transcript.jsonl`

- [ ] **Step 1: Create the test fixture `scripts/v2/fixtures/sample-transcript.jsonl`**

A trimmed sample mirroring the real Claude Code transcript shape (noise lines + user/assistant message lines with content blocks). One object per line:

```jsonl
{"type":"mode","mode":"normal"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"a test is failing, fix it"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Let me run the tests first."},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"npm test"}}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"FAIL src/cart.test.js\n1 failed, 4 passed"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"The cap isn't applied. I'll fix cart.js."},{"type":"tool_use","id":"t2","name":"Edit","input":{"file_path":"cart.js","old_string":"return pct","new_string":"return Math.min(pct,100)"}}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t2","content":"ok"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"All tests pass now."}]}}
```

- [ ] **Step 2: Write the failing test `scripts/v2/harvest.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { harvestTranscript } from './harvest';

const raw = readFileSync(new URL('./fixtures/sample-transcript.jsonl', import.meta.url), 'utf8');

describe('harvestTranscript', () => {
  const beats = harvestTranscript(raw);

  it('drops noise lines (mode/permission/hooks)', () => {
    expect(beats.every((b) => b.kind !== undefined)).toBe(true);
    expect(beats.length).toBeGreaterThanOrEqual(4);
  });

  it('first beat is the user request', () => {
    expect(beats[0]!.kind).toBe('user');
    expect(beats[0]!.text).toContain('failing');
  });

  it('captures tool calls as model-speaks beats with name+input', () => {
    const call = beats.find((b) => b.kind === 'model-speaks' && b.toolCall?.name === 'Bash');
    expect(call?.toolCall?.arguments).toMatchObject({ command: 'npm test' });
    expect(call?.thought).toContain('run the tests');
  });

  it('captures tool results as runtime-acts beats', () => {
    const obs = beats.find((b) => b.kind === 'runtime-acts');
    expect(obs?.observation).toContain('FAIL');
  });
});
```

- [ ] **Step 3: Run, verify FAIL** — `npm test -- scripts/v2/harvest.test.ts`

> Note: vitest's `include` is `src/**/*.test.ts`. Add `'scripts/**/*.test.ts'` to `vitest.config.ts` `test.include` so this runs. Show the one-line change in this step and stage `vitest.config.ts` with the commit.

- [ ] **Step 4: Implement `scripts/v2/harvest.ts`**

```ts
// Parse a Claude Code session .jsonl into ordered raw beats. This is the MECHANICAL
// half; curation (selecting/trimming/authoring zoom content) is a separate human/LLM pass.
export type RawBeat =
  | { kind: 'user'; text: string }
  | { kind: 'model-speaks'; thought: string; toolCall?: { name: string; arguments: Record<string, unknown> } }
  | { kind: 'runtime-acts'; observation: string }
  | { kind: 'final'; text: string };

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: unknown };

export function harvestTranscript(jsonl: string): RawBeat[] {
  const lines = jsonl.split('\n').map((l) => l.trim()).filter(Boolean);
  const beats: RawBeat[] = [];

  for (const line of lines) {
    let evt: any;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== 'user' && evt.type !== 'assistant') continue; // drop mode/hook/etc noise
    const content: Block[] = evt.message?.content ?? [];
    const text = content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n').trim();

    if (evt.type === 'user') {
      const result = content.find((b): b is Extract<Block, { type: 'tool_result' }> => b.type === 'tool_result');
      if (result) {
        const obs = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        beats.push({ kind: 'runtime-acts', observation: obs });
      } else if (text) {
        beats.push({ kind: 'user', text });
      }
    } else { // assistant
      const call = content.find((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
      if (call) {
        beats.push({ kind: 'model-speaks', thought: text, toolCall: { name: call.name, arguments: call.input } });
      } else if (text) {
        beats.push({ kind: 'final', text });
      }
    }
  }
  return beats;
}
```

- [ ] **Step 5: Run, verify PASS** — `npm test -- scripts/v2/harvest.test.ts`

- [ ] **Step 6: Commit**

```bash
git add scripts/v2/harvest.ts scripts/v2/harvest.test.ts scripts/v2/fixtures/sample-transcript.jsonl vitest.config.ts
git commit -F - <<'EOF'
feat(v2): add Claude Code transcript harvester (.jsonl -> raw beats)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 8: Capture the real hero session

This is a **manual capture** (real Claude Code on a real buggy repo), not code. The output is provenance + raw beats to curate in Task 9.

**Files:**
- Create: `sandboxes/fix-failing-test/` (a tiny buggy JS project), `src/data/v2/fix-failing-test/raw-transcript.jsonl`

- [ ] **Step 1: Create the buggy repo `sandboxes/fix-failing-test/`**

A minimal project with one failing test. `sandboxes/fix-failing-test/cart.js`:
```js
export function applyDiscount(price, pct) {
  // BUG: doesn't cap at 100%
  return price - price * (pct / 100);
}
```
`sandboxes/fix-failing-test/cart.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './cart.js';

describe('applyDiscount', () => {
  it('100% off -> free', () => { expect(applyDiscount(50, 100)).toBe(0); });
  it('caps over-100% at free (never negative)', () => { expect(applyDiscount(50, 130)).toBe(0); });
  it('50% off', () => { expect(applyDiscount(50, 50)).toBe(25); });
});
```
(The second test fails: 130% yields a negative price.)

- [ ] **Step 2: Run a real Claude Code session that fixes it, and save the transcript**

In a *separate* terminal, run Claude Code inside `sandboxes/fix-failing-test/` with the task "a test is failing, fix it" — **with extended thinking ON** so beats have reasoning. Let it run the loop to green. Then copy that session's transcript JSONL (from `~/.claude/projects/<encoded-path>/<session>.jsonl`) to `src/data/v2/fix-failing-test/raw-transcript.jsonl`.

Expected: the transcript contains the read → `npm test` (red) → edit `cart.js` → `npm test` (green) loop.

- [ ] **Step 3: Sanity-harvest it**

```bash
npx tsx -e "import('./scripts/v2/harvest.ts').then(async m=>{const fs=await import('node:fs');console.log(JSON.stringify(m.harvestTranscript(fs.readFileSync('src/data/v2/fix-failing-test/raw-transcript.jsonl','utf8')),null,2))})"
```
Expected: prints ordered raw beats matching the real loop. (If the real transcript shape differs from the fixture, adjust `harvest.ts` + its test, then re-commit Task 7.)

- [ ] **Step 4: Commit the provenance**

```bash
git add sandboxes/fix-failing-test/ src/data/v2/fix-failing-test/raw-transcript.jsonl
git commit -F - <<'EOF'
feat(v2): add hero buggy-repo sandbox + captured real Claude Code transcript

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 9: Curate the hero `StoryRun` (authored content) + validate

The largest design task: turn raw beats into a teaching `StoryRun` with authored bilingual zoom content, and validate against the schema. This is hand-authored (informed by the harvest), not generated.

**Files:**
- Create: `src/data/v2/fix-failing-test/story.zh.json`, `src/data/v2/fix-failing-test/story.en.json`, `scripts/v2/validate-v2.ts`

- [ ] **Step 1: Author `story.zh.json` and `story.en.json`**

Using the harvested raw beats as the skeleton, write one `StoryRun` per language conforming to `StoryRunSchema` (Task 2). For each beat: a plain-language `title`/`summary`; for "model-speaks" beats a `zoom` with L1 (intuition: "it predicted tokens") / L2 (tokenize→prob→sample→function-call) / L3 (raw ids, distribution, emitted JSON, parse convention), a `seedContext` (the real context at that moment), a `tokenFallbackRef` (e.g. `token-fallback.json#b1`), and a `bridge` (the curiosity question to the next beat); for "runtime-acts" beats a trimmed real `observation` + zoom explaining "the runtime, not the model, ran this". Keep beat `id`s aligned with the `token-fallback.json` keys (Task 6's `BEATS`).

The shape is fully fixed by `StoryRunSchema`; conform exactly. Concrete worked example for one "model-speaks" beat (en), to anchor the authoring — replicate this shape for every beat, in both languages:

```json
{
  "id": "b1",
  "kind": "model-speaks",
  "title": { "zh": "模型决定先跑测试", "en": "The model decides to run the tests" },
  "summary": { "zh": "它没有“决定”,只是预测出的下一串字正好是一条命令。", "en": "It didn't \"decide\" — the next tokens it predicted happen to be a command." },
  "thought": "Let me run the tests first to see what's failing.",
  "toolCall": { "name": "Bash", "arguments": { "command": "npm test" } },
  "zoom": {
    "levels": [
      { "level": 1, "title": { "zh": "它在猜下一个字", "en": "It is guessing the next token" },
        "body": { "zh": "模型逐个预测 token;这串 token 拼起来恰好是一条 run-tests 命令。", "en": "The model predicts tokens one at a time; strung together they happen to form a run-tests command." } },
      { "level": 2, "title": { "zh": "分词 → 概率 → 采样 → 拼成调用", "en": "tokenize → probability → sampling → assembled call" },
        "body": { "zh": "把你的话切成 token,每步给整个词表打分,采样选一个,直到拼出 function call 的 JSON。", "en": "Your words become tokens; each step scores the whole vocabulary; sampling picks one; repeat until the function-call JSON is assembled." },
        "callouts": [ { "label": { "zh": "看最长那条 = 最可能", "en": "the longest bar = most likely" }, "ref": "topk-0" } ] },
      { "level": 3, "title": { "zh": "最底层:真实数字", "en": "Bottom: the real numbers" },
        "body": { "zh": "真实 token id、带小数的 logprob、模型吐出的原始 JSON,以及把这串字当成命令的解析约定。", "en": "Real token ids, decimal logprobs, the literal emitted JSON, and the parsing convention that treats this string as a command." } }
    ],
    "seedContext": "You are fixing a failing test in a JS project. The next action is to run the tests. Command:",
    "tokenFallbackRef": "token-fallback.json#b1"
  },
  "bridge": { "zh": "这串文字怎么就“真的执行”了?", "en": "how does this text actually get executed?" }
}
```

- [ ] **Step 2: Write the validator `scripts/v2/validate-v2.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { StoryRunSchema, TokenFallbackSchema } from '../../src/types/v2-schemas.js';

const ROOT = 'src/data/v2';
let failures = 0;

for (const scenario of readdirSync(ROOT)) {
  const dir = join(ROOT, scenario);
  for (const lang of ['zh', 'en'] as const) {
    const f = join(dir, `story.${lang}.json`);
    try {
      StoryRunSchema.parse(JSON.parse(readFileSync(f, 'utf8')));
      console.log(`✓ ${f}`);
    } catch (e) { failures++; console.error(`✗ ${f}\n${String(e).slice(0, 400)}`); }
  }
  const tf = join(dir, 'token-fallback.json');
  try {
    const data = TokenFallbackSchema.parse(JSON.parse(readFileSync(tf, 'utf8')));
    // every tokenFallbackRef in the zh story must resolve to a key here
    const story = StoryRunSchema.parse(JSON.parse(readFileSync(join(dir, 'story.zh.json'), 'utf8')));
    for (const b of story.beats) {
      const ref = b.zoom?.tokenFallbackRef;
      if (ref) {
        const key = ref.split('#')[1]!;
        if (!data[key]) { failures++; console.error(`✗ ${scenario}: tokenFallbackRef ${ref} has no matching key`); }
      }
    }
    console.log(`✓ ${tf}`);
  } catch (e) { failures++; console.error(`✗ ${tf}\n${String(e).slice(0, 400)}`); }
}
if (failures) { console.error(`\n${failures} validation failure(s)`); process.exit(1); }
console.log('\nall v2 data valid');
```

- [ ] **Step 3: Run the validator**

```bash
npx tsx scripts/v2/validate-v2.ts
```
Expected: `all v2 data valid`. Fix authored JSON until it passes (and re-run Task 6's capture if any `seedContext`/beat id changed, so `tokenFallbackRef`s resolve).

- [ ] **Step 4: Commit**

```bash
git add src/data/v2/fix-failing-test/story.zh.json src/data/v2/fix-failing-test/story.en.json scripts/v2/validate-v2.ts
git commit -F - <<'EOF'
feat(v2): curate + validate hero "fix failing test" StoryRun (zh/en)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 4 — Wrap

### Task 10: Record the data contract + verify everything green

**Files:**
- Modify: `docs/recording-notes.md`

- [ ] **Step 1: Document v2 in `docs/recording-notes.md`**

Append a `## v2 data foundation` section: the two sources (Claude Code transcript replay + Qwen token data), the `StoryRun` shape, the live-vs-recorded decision from Task 1, the chosen model id, how to re-capture (`harvest.ts` + a real CC session) and re-record token data (`capture-token-fallback.ts`), and the integrity note that token data may be live (browser) or recorded (this file).

- [ ] **Step 2: Full verification**

```bash
npm test
npm run build
npx tsx scripts/v2/validate-v2.ts
```
Expected: all tests pass (v1's 56 + the new v2 unit tests); build green; v2 data valid.

- [ ] **Step 3: Commit + push + tag**

```bash
git add docs/recording-notes.md
git commit -F - <<'EOF'
docs(v2): record v2 data foundation contract + recapture instructions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
git push origin main
git tag plan-c1-complete -m "Plan C1: v2 data foundation complete"
git push origin plan-c1-complete
```

---

## End of Plan C1

C1 delivers: the pre-flight decision (live-vs-recorded), the v2 data model, the `TokenMicroscope` module (live + recorded), the transcript harvester, and the curated + validated hero `StoryRun` with its recorded token fallback. **Plan C2 (frontend zoom experience) is written next, informed by Task 1's outcome.** The other two scenarios (🟢 clean-big-files, 🌤 error-recovery) are captured + curated during C2's "scale" phase by reusing this plan's harvester + curation flow.
