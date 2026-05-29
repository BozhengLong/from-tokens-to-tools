# Plan B: Frontend Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-page, scrollable 7-station whiteboard narrative that consumes the recorded JSON from Plan A and answers "why does a token generator control my computer," in English + 中文.

**Architecture:** Vite + React + TS SPA. Zustand holds global state (current example, language, per-station UI state). Recorded data is lazy-imported per example×language and validated with Zod at load. Each station is a self-contained component reading its typed data slice and animating with Framer Motion. The browser-side `ToolContext` powers optional "🔄 refresh" live calls and the real `save_*` side effects. Whiteboard visuals come from a small set of reusable primitives styled with the Tailwind v4 theme already configured in Plan A.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (CSS-first `@theme`), Zustand 5, Zod 4, Framer Motion, KaTeX (lazy), vitest 4.

**Reference:** Design spec `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-design.md`. Plan A is complete (tag `plan-a-complete`); data lives in `src/data/examples/<id>/<station>.{zh,en}.json`, schemas/types in `src/types/schemas.ts`, tools in `src/tools/`, sandbox fixture in `src/data/sandboxes/`.

---

## Data contracts (already defined in `src/types/schemas.ts`, do not redefine)

Import types from `@/types/schemas`:
- `TokenizeData` = `{ _meta, prompt: string, tokens: {id,text,byteRange:[number,number]}[] }`
- `LogitsData` = `{ _meta, steps: {stepIndex, contextPreview, topK: {token,tokenId,logprob}[]}[] }`
- `SamplingData` = `{ _meta, baseStep, baseStepLogprobs: {token,tokenId,logprob}[], paths: {method:'greedy'|'low-temp'|'top-p'|'high-temp', params: Record<string,number>, tokens: string[]}[] }`
- `FunctionCallData` = `{ _meta, reasoning: string, toolCandidates: {name,logprob}[], call: {name, arguments} }`
- `TopologyData` = `{ _meta, reactive: AgentLoopData, deliberative: { plan: {id,stepLabel,expectedToolCall?}[], execution: {planStepId:string|null, actualCall, observation, deviated}[], deviationSummary } }`
- `AgentLoopData` = `{ iterations: {thought, action:{name,arguments}, observation}[], terminationReason:'text-final'|'final-action-called'|'max-iter', finalText?, terminationNote }`
- Manifest layer (`Example`) = `{ id, name:{zh,en}, taskPrompt:{zh,en}, tools:[...], finalActionTools:[], systemPromptExtras?, sandboxFixture? }`

Example manifests are YAML at `scripts/record/manifests/<id>.yaml`, importable via the already-wired `@rollup/plugin-yaml`.

---

## File Structure

```
src/
├── main.tsx                          # MODIFY: mount <App/>, import index.css
├── App.tsx                           # REWRITE: compose layout + stations
├── App.css                           # DELETE (Vite boilerplate)
├── assets/                           # DELETE hero.png/react.svg/vite.svg
├── i18n/
│   ├── strings.ts                    # NEW: all static UI copy, zh/en
│   ├── strings.test.ts               # NEW: parity test (zh keys == en keys)
│   └── useLanguage.ts                # NEW: hook reading lang from store
├── state/
│   ├── store.ts                      # NEW: Zustand store
│   └── store.test.ts                 # NEW
├── examples/
│   ├── registry.ts                   # NEW: 4 manifests + id list + default
│   └── loadExampleData.ts            # NEW: lazy import + Zod validate one station file
│   └── loadExampleData.test.ts       # NEW
├── runtime/
│   └── browser-context.ts            # NEW: ToolContext for the browser
│   └── browser-context.test.ts       # NEW
├── utils/
│   ├── byteToCharRange.ts            # NEW: UTF-8 byte range -> JS string slice
│   ├── byteToCharRange.test.ts       # NEW
│   ├── sampling.ts                   # NEW: softmax/temperature re-weighting (pure)
│   ├── sampling.test.ts              # NEW
│   └── format.ts                     # NEW: number/bytes formatting helpers
│   └── format.test.ts                # NEW
├── components/
│   ├── whiteboard/
│   │   ├── ChalkHeading.tsx          # NEW: hand-font heading (en) / system (zh)
│   │   ├── Card.tsx                  # NEW: double-line "whiteboard box"
│   │   ├── TokenChip.tsx             # NEW: a token capsule
│   │   ├── ProbBar.tsx               # NEW: one horizontal probability bar
│   │   ├── InkArrow.tsx              # NEW: svg arrow
│   │   └── JsonBlock.tsx             # NEW: minimal JSON pretty-printer
│   ├── layout/
│   │   ├── Header.tsx                # NEW: progress + example selector + lang toggle
│   │   ├── ProgressBar.tsx           # NEW: scroll progress
│   │   ├── ExampleSelector.tsx       # NEW: 4 pills
│   │   ├── LanguageToggle.tsx        # NEW: zh/en
│   │   ├── StationSection.tsx        # NEW: shared station shell (name/intro/viz/card)
│   │   ├── LoadingVeil.tsx           # NEW: loading state overlay
│   │   └── Epilogue.tsx              # NEW: closing + 3 links
│   └── stations/
│       ├── Station1Tokenize.tsx      # NEW
│       ├── Station2Logits.tsx        # NEW
│       ├── Station3Sampling.tsx      # NEW
│       ├── Station4FunctionCall.tsx  # NEW
│       ├── Station5Execution.tsx     # NEW
│       ├── Station6AgentLoop.tsx     # NEW
│       └── Station7Topology.tsx      # NEW
└── hooks/
    └── useStationData.ts             # NEW: load+validate current example/lang station data
    └── useStationData.test.ts        # NEW
```

---

## Phase 1: Cleanup + State + i18n + Utils

### Task 1: Remove Vite boilerplate, blank App

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Delete: `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg` (if present)

- [ ] **Step 1: Replace `src/App.tsx` with a minimal placeholder**

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-whiteboard-bg text-whiteboard-ink font-sans">
      <h1 className="p-8 text-2xl">from tokens to tools</h1>
    </main>
  );
}
```

- [ ] **Step 2: Ensure `src/main.tsx` imports index.css and mounts App**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Delete boilerplate assets**

```bash
cd ~/workspace/from-tokens-to-tools
rm -f src/App.css src/assets/hero.png src/assets/react.svg src/assets/vite.svg public/icons.svg
rmdir src/assets 2>/dev/null || true
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds, no missing-import errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(ui): strip Vite boilerplate, blank App shell"
```

---

### Task 2: Zustand store

**Files:**
- Create: `src/state/store.ts`, `src/state/store.test.ts`

Station interaction state (temperature, step counters) lives in each station's
local `useState`; it is reset on example/language switch by remounting the
stations with a `key` in `App.tsx` (Task 22). So the store stays minimal:
just `exampleId` + `lang` and their setters. `setLang` persists to localStorage.

- [ ] **Step 1: Write failing test**

```ts
// src/state/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ exampleId: 'downloads-bigfiles', lang: 'zh' });
  });

  it('defaults: example=downloads-bigfiles, lang=zh', () => {
    const s = useAppStore.getState();
    expect(s.exampleId).toBe('downloads-bigfiles');
    expect(s.lang).toBe('zh');
  });

  it('setExample changes the example', () => {
    useAppStore.getState().setExample('shanghai-weather');
    expect(useAppStore.getState().exampleId).toBe('shanghai-weather');
  });

  it('setLang changes the language', () => {
    useAppStore.getState().setLang('en');
    expect(useAppStore.getState().lang).toBe('en');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- src/state/store.test.ts`
Expected: FAIL, cannot find module './store'.

- [ ] **Step 3: Implement `src/state/store.ts`**

```ts
import { create } from 'zustand';

export type Lang = 'zh' | 'en';

type AppState = {
  exampleId: string;
  lang: Lang;
  setExample: (id: string) => void;
  setLang: (lang: Lang) => void;
};

const LANG_KEY = 'ftt-lang';

const initialLang: Lang =
  (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY) === 'en') ? 'en' : 'zh';

export const useAppStore = create<AppState>((set) => ({
  exampleId: 'downloads-bigfiles',
  lang: initialLang,
  setExample: (id) => set({ exampleId: id }),
  setLang: (lang) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
    set({ lang });
  },
}));
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/state/store.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts src/state/store.test.ts
git commit -m "feat(ui): add Zustand app store (example/lang/station UI)"
```

---

### Task 3: i18n strings + parity test + useLanguage hook

**Files:**
- Create: `src/i18n/strings.ts`, `src/i18n/strings.test.ts`, `src/i18n/useLanguage.ts`

- [ ] **Step 1: Write failing parity test**

```ts
// src/i18n/strings.test.ts
import { describe, it, expect } from 'vitest';
import { STRINGS } from './strings';

describe('STRINGS', () => {
  it('zh and en have identical key sets', () => {
    const zhKeys = Object.keys(STRINGS.zh).sort();
    const enKeys = Object.keys(STRINGS.en).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('no empty values', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const [k, v] of Object.entries(STRINGS[lang])) {
        expect(v, `${lang}.${k}`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- src/i18n/strings.test.ts`

- [ ] **Step 3: Implement `src/i18n/strings.ts`**

```ts
import type { Lang } from '@/state/store';

type Dict = Record<string, string>;

const zh: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: '为什么一个只会预测下一个 token 的东西,能控制我的电脑?',
  langName: '中文',
  st1Name: '分词 Tokenization',
  st1Hook: 'AI 不读字。它读的是这串数字。',
  st2Name: '概率分布 Logprobs',
  st2Hook: '每一步,模型给出整个词表的可能性投票。我们能看到票数最高的 20 个。',
  st3Name: '采样 Sampling',
  st3Hook: '看,"确定性" 是个滑块。',
  st4Name: '结构化输出 Function Call',
  st4Hook: '从"我想做 X"到一个特殊的 token 序列——这就是工具调用。',
  st5Name: '工具执行 Tool Execution',
  st5Hook: '模型不会动你的硬盘。它生成字符串,你的代码动你的硬盘。',
  st6Name: 'Agent 循环',
  st6Hook: '一个 while 循环。条件是模型自己说停。',
  st7Name: 'Reactive vs Deliberative',
  st7Hook: '同一个任务,两种 agent。一个走着看,一个想清楚再走。',
  epilogueTitle: '没有魔法,只有约定。',
  epilogueBody: '你走过的每一步都是一个约定。它们叠在一起,把一个概率机器变成了能控制电脑的 agent。',
  linkSource: '源码',
  linkRecording: '录制说明',
  linkSpec: '设计文档',
  loading: '加载录制数据…',
  dataUnavailable: '录制数据未就绪',
  temperature: '温度 (temperature)',
  resample: '重新采样',
  refreshLive: '🔄 从 live 刷新',
  observationLabel: '工具返回 (observation)',
  thoughtLabel: '思考 (Thought)',
  actionLabel: '调用 (Action)',
  showTopCandidates: '为什么是这个工具?',
  reactiveLabel: 'Reactive(走着看)',
  deliberativeLabel: 'Deliberative(先规划)',
  stepForward: '下一步',
  autoplay: '自动播放',
};

const en: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: 'Why does a thing that only predicts the next token end up controlling my computer?',
  langName: 'EN',
  st1Name: 'Tokenization',
  st1Hook: "AI doesn't read letters. It reads these numbers.",
  st2Name: 'Logprobs',
  st2Hook: 'Each step, the model votes across the whole vocabulary. We see the top 20.',
  st3Name: 'Sampling',
  st3Hook: 'Look — "certainty" is a slider.',
  st4Name: 'Function Call',
  st4Hook: 'From "I want to do X" to a special token sequence — that is a tool call.',
  st5Name: 'Tool Execution',
  st5Hook: 'The model never touches your disk. It emits strings; your code touches your disk.',
  st6Name: 'Agent Loop',
  st6Hook: 'A while loop. The condition is the model saying stop.',
  st7Name: 'Reactive vs Deliberative',
  st7Hook: 'Same task, two agents. One looks as it goes, one thinks first.',
  epilogueTitle: 'No magic, just conventions.',
  epilogueBody: 'Every step you walked is one convention. Stacked together they turn a probability machine into an agent that controls a computer.',
  linkSource: 'Source',
  linkRecording: 'Recording notes',
  linkSpec: 'Design spec',
  loading: 'Loading recorded data…',
  dataUnavailable: 'Recording not available',
  temperature: 'temperature',
  resample: 'Resample',
  refreshLive: '🔄 Refresh from live',
  observationLabel: 'observation',
  thoughtLabel: 'Thought',
  actionLabel: 'Action',
  showTopCandidates: 'Why this tool?',
  reactiveLabel: 'Reactive (look as you go)',
  deliberativeLabel: 'Deliberative (plan first)',
  stepForward: 'Step',
  autoplay: 'Autoplay',
};

export const STRINGS: Record<Lang, Dict> = { zh, en };
export type StringKey = keyof typeof zh;
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/i18n/strings.test.ts`

- [ ] **Step 5: Implement `src/i18n/useLanguage.ts`**

```ts
import { useAppStore } from '@/state/store';
import { STRINGS, type StringKey } from './strings';

export function useLanguage() {
  const lang = useAppStore((s) => s.lang);
  const t = (key: StringKey): string => STRINGS[lang][key];
  return { lang, t };
}
```

- [ ] **Step 6: Run build + commit**

```bash
npm run build
git add src/i18n/
git commit -m "feat(ui): add i18n strings (zh/en) with parity test + useLanguage hook"
```

---

### Task 4: `byteToCharRange` util

**Files:** Create `src/utils/byteToCharRange.ts`, `src/utils/byteToCharRange.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/utils/byteToCharRange.test.ts
import { describe, it, expect } from 'vitest';
import { byteToCharRange } from './byteToCharRange';

describe('byteToCharRange', () => {
  it('maps ascii byte range to identical char range', () => {
    expect(byteToCharRange('hello', [0, 2])).toEqual([0, 2]);
  });

  it('maps a multi-byte CJK range to char indices', () => {
    // "列出" — each char is 3 UTF-8 bytes
    const s = '列出 Downloads';
    expect(byteToCharRange(s, [0, 3])).toEqual([0, 1]);   // 列
    expect(byteToCharRange(s, [3, 6])).toEqual([1, 2]);   // 出
  });

  it('clamps out-of-range byte offsets', () => {
    expect(byteToCharRange('hi', [0, 999])).toEqual([0, 2]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/utils/byteToCharRange.ts`**

```ts
// Maps a UTF-8 byte range (as produced by the tokenizer) to a JS string
// [startChar, endChar) slice range. JS strings are UTF-16, so we walk the
// string accumulating each character's UTF-8 byte length.
export function byteToCharRange(text: string, byteRange: [number, number]): [number, number] {
  const [startByte, endByte] = byteRange;
  const enc = new TextEncoder();
  let byteCursor = 0;
  let startChar = 0;
  let endChar = text.length;
  let foundStart = false;
  const chars = [...text]; // code-point aware
  let charIndex = 0;
  // recompute char index in terms of UTF-16 units for slicing
  let utf16Index = 0;
  for (const ch of chars) {
    if (!foundStart && byteCursor >= startByte) {
      startChar = utf16Index;
      foundStart = true;
    }
    if (byteCursor >= endByte) {
      endChar = utf16Index;
      break;
    }
    byteCursor += enc.encode(ch).length;
    utf16Index += ch.length;
    charIndex += 1;
  }
  if (!foundStart) startChar = Math.min(utf16Index, text.length);
  if (byteCursor < endByte) endChar = text.length;
  return [Math.min(startChar, text.length), Math.min(endChar, text.length)];
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/byteToCharRange.ts src/utils/byteToCharRange.test.ts
git commit -m "feat(ui): add byteToCharRange (UTF-8 byte range -> JS slice)"
```

---

### Task 5: `sampling` util (softmax + temperature re-weighting)

**Files:** Create `src/utils/sampling.ts`, `src/utils/sampling.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/utils/sampling.test.ts
import { describe, it, expect } from 'vitest';
import { softmaxFromLogprobs, applyTemperature } from './sampling';

describe('softmaxFromLogprobs', () => {
  it('returns probabilities summing to 1', () => {
    const probs = softmaxFromLogprobs([-0.1, -1.0, -3.0]);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('higher logprob -> higher probability', () => {
    const [p0, p1] = softmaxFromLogprobs([-0.1, -2.0]);
    expect(p0).toBeGreaterThan(p1);
  });
});

describe('applyTemperature', () => {
  it('temperature 1 leaves the distribution unchanged (within tolerance)', () => {
    const base = softmaxFromLogprobs([-0.1, -1.0, -3.0]);
    const t1 = applyTemperature([-0.1, -1.0, -3.0], 1);
    base.forEach((p, i) => expect(t1[i]).toBeCloseTo(p, 5));
  });

  it('high temperature flattens the distribution (max prob decreases)', () => {
    const cold = applyTemperature([-0.1, -1.0, -3.0], 0.3);
    const hot = applyTemperature([-0.1, -1.0, -3.0], 2.0);
    expect(Math.max(...hot)).toBeLessThan(Math.max(...cold));
  });

  it('temperature 0 collapses to argmax (one-hot)', () => {
    const probs = applyTemperature([-0.1, -1.0, -3.0], 0);
    expect(probs[0]).toBeCloseTo(1, 5);
    expect(probs[1]).toBeCloseTo(0, 5);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/utils/sampling.ts`**

```ts
// Pure math for Station 3. Operates on the top-K logprobs we recorded; the
// temperature slider re-softmaxes within that visible subset (see design §6).
export function softmaxFromLogprobs(logprobs: number[]): number[] {
  const max = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Temperature scaling: divide logits by T before softmax. We only have logprobs
// (= log p, proportional to logits up to a constant), which is fine because the
// shared constant cancels in softmax. T=0 is treated as argmax (one-hot).
export function applyTemperature(logprobs: number[], temperature: number): number[] {
  if (temperature <= 0) {
    const maxIdx = logprobs.indexOf(Math.max(...logprobs));
    return logprobs.map((_, i) => (i === maxIdx ? 1 : 0));
  }
  return softmaxFromLogprobs(logprobs.map((lp) => lp / temperature));
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/sampling.ts src/utils/sampling.test.ts
git commit -m "feat(ui): add sampling util (softmax + temperature re-weighting)"
```

---

### Task 6: `format` util

**Files:** Create `src/utils/format.ts`, `src/utils/format.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatBytes, formatPct } from './format';

describe('formatBytes', () => {
  it('formats GB', () => { expect(formatBytes(2_400_000_000)).toBe('2.4 GB'); });
  it('formats MB', () => { expect(formatBytes(89_000_000)).toBe('89.0 MB'); });
  it('formats small', () => { expect(formatBytes(2400)).toBe('2.4 KB'); });
});

describe('formatPct', () => {
  it('formats a probability as a percentage', () => { expect(formatPct(0.1234)).toBe('12.3%'); });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/utils/format.ts`**

```ts
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let u = 0;
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return `${v.toFixed(1)} ${units[u]}`;
}

export function formatPct(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat(ui): add format util (bytes, percent)"
```

---

## Phase 2: Example registry + data loading + browser runtime

### Task 7: Example registry

**Files:** Create `src/examples/registry.ts`

- [ ] **Step 1: Implement `src/examples/registry.ts`**

```ts
import downloads from '../../scripts/record/manifests/downloads-bigfiles.yaml';
import weather from '../../scripts/record/manifests/shanghai-weather.yaml';
import wiki from '../../scripts/record/manifests/wikipedia-tweet.yaml';
import hn from '../../scripts/record/manifests/hn-weekend-pick.yaml';

// YAML manifests carry tool *names*; the UI doesn't need full ToolSpec, so we
// coerce the raw manifest into a partial Example shape for display purposes.
type RawManifest = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: string[];
  finalActionTools: string[];
  systemPromptExtras?: { zh: string; en: string };
  sandboxFixture?: string;
};

const RAW: RawManifest[] = [downloads, weather, wiki, hn] as RawManifest[];

export type ExampleMeta = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  toolNames: string[];
  finalActionTools: string[];
  sandboxFixture?: string;
};

export const EXAMPLES: ExampleMeta[] = RAW.map((r) => ({
  id: r.id,
  name: r.name,
  taskPrompt: r.taskPrompt,
  toolNames: r.tools,
  finalActionTools: r.finalActionTools,
  sandboxFixture: r.sandboxFixture,
}));

export const DEFAULT_EXAMPLE_ID = 'downloads-bigfiles';

export function getExample(id: string): ExampleMeta {
  const found = EXAMPLES.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown example: ${id}`);
  return found;
}

// Defensive check (YAML is hand-authored). Asserts the subset the UI relies on.
export function assertExamplesValid(): void {
  for (const r of RAW) {
    if (!r.id || !r.name?.zh || !r.name?.en || !r.taskPrompt?.zh) {
      throw new Error(`Malformed manifest: ${JSON.stringify(r).slice(0, 80)}`);
    }
  }
}
```

- [ ] **Step 2: Verify YAML import works**

Run: `npm run build`
Expected: build succeeds. If the YAML import errors (`Cannot find module '...yaml'`), add a type shim `src/yaml.d.ts`:
```ts
declare module '*.yaml' {
  const value: unknown;
  export default value;
}
```
then rebuild.

- [ ] **Step 3: Commit**

```bash
git add src/examples/registry.ts src/yaml.d.ts 2>/dev/null
git commit -m "feat(ui): add example registry from YAML manifests"
```

---

### Task 8: `loadExampleData` — lazy import + Zod validate

**Files:** Create `src/examples/loadExampleData.ts`, `src/examples/loadExampleData.test.ts`

- [ ] **Step 1: Write failing test** (validates the real recorded files on disk)

```ts
// src/examples/loadExampleData.test.ts
import { describe, it, expect } from 'vitest';
import { loadStation } from './loadExampleData';

describe('loadStation (real recorded data)', () => {
  it('loads + validates downloads tokenize zh', async () => {
    const data = await loadStation('downloads-bigfiles', 'tokenize', 'zh');
    expect(data.tokens.length).toBeGreaterThan(0);
    expect(data.prompt).toBeTruthy();
  });

  it('loads topology with reactive iterations', async () => {
    const data = await loadStation('hn-weekend-pick', 'topology', 'en');
    expect(data.reactive.iterations.length).toBeGreaterThan(0);
    expect(['text-final', 'final-action-called', 'max-iter']).toContain(data.reactive.terminationReason);
  });

  it('throws on unknown example (rejected import)', async () => {
    await expect(loadStation('does-not-exist', 'tokenize', 'zh')).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/examples/loadExampleData.ts`**

```ts
import {
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, TopologyDataSchema,
  type TokenizeData, type LogitsData, type SamplingData,
  type FunctionCallData, type TopologyData,
} from '@/types/schemas';
import type { Lang } from '@/state/store';

export type StationFile = 'tokenize' | 'logits' | 'sampling' | 'function-calls' | 'topology';

export type StationReturn = {
  tokenize: TokenizeData;
  logits: LogitsData;
  sampling: SamplingData;
  'function-calls': FunctionCallData;
  topology: TopologyData;
};

const SCHEMAS = {
  tokenize: TokenizeDataSchema,
  logits: LogitsDataSchema,
  sampling: SamplingDataSchema,
  'function-calls': FunctionCallDataSchema,
  topology: TopologyDataSchema,
} as const;

// Vite needs a static glob to know which JSON to bundle/split.
const MODULES = import.meta.glob('../data/examples/*/*.json');

export async function loadStation<K extends StationFile>(
  exampleId: string,
  station: K,
  lang: Lang
): Promise<StationReturn[K]> {
  const path = `../data/examples/${exampleId}/${station}.${lang}.json`;
  const loader = MODULES[path];
  if (!loader) throw new Error(`No recorded data at ${path}`);
  const mod = (await loader()) as { default: unknown };
  const schema = SCHEMAS[station];
  return schema.parse(mod.default) as StationReturn[K];
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/examples/loadExampleData.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/examples/loadExampleData.ts src/examples/loadExampleData.test.ts
git commit -m "feat(ui): add loadStation (lazy import + Zod validation)"
```

---

### Task 9: `useStationData` hook

**Files:** Create `src/hooks/useStationData.ts`, `src/hooks/useStationData.test.ts`

- [ ] **Step 1: Write failing test** (uses @testing-library/react renderHook)

First install testing libs:
```bash
npm install -D @testing-library/react @testing-library/dom jsdom
```
Add to `vitest.config.ts` test config: `environment: 'jsdom'` is needed for hook tests; but node env is set globally. Use a per-file environment comment instead. Put at top of the test file: `// @vitest-environment jsdom`.

```ts
// src/hooks/useStationData.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStationData } from './useStationData';

describe('useStationData', () => {
  it('loads tokenize data for the current store example/lang', async () => {
    const { result } = renderHook(() => useStationData('tokenize'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.data.tokens.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/hooks/useStationData.ts`**

```ts
import { useEffect, useState } from 'react';
import { useAppStore } from '@/state/store';
import { loadStation, type StationFile, type StationReturn } from '@/examples/loadExampleData';

type Result<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

export function useStationData<K extends StationFile>(station: K) {
  const exampleId = useAppStore((s) => s.exampleId);
  const lang = useAppStore((s) => s.lang);
  const [state, setState] = useState<Result<StationReturn[K]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadStation(exampleId, station, lang)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch((e) => { if (!cancelled) setState({ status: 'error', error: String(e) }); });
    return () => { cancelled = true; };
  }, [exampleId, lang, station]);

  return state;
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/hooks/useStationData.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStationData.ts src/hooks/useStationData.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat(ui): add useStationData hook (reactive load on example/lang change)"
```

---

### Task 10: Browser `ToolContext`

**Files:** Create `src/runtime/browser-context.ts`, `src/runtime/browser-context.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/runtime/browser-context.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBrowserContext } from './browser-context';

describe('createBrowserContext', () => {
  beforeEach(() => { localStorage.clear(); });

  it('storage delegates to localStorage', () => {
    const ctx = createBrowserContext();
    ctx.storage.setItem('k', 'v');
    expect(ctx.storage.getItem('k')).toBe('v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('notify falls back to toast channel when permission denied', async () => {
    // jsdom has no Notification; createBrowserContext must degrade gracefully
    const ctx = createBrowserContext();
    const res = await ctx.notify({ title: 'x', body: 'y' });
    expect(['toast', 'system', 'mock']).toContain(res.channel);
    expect(typeof res.delivered).toBe('boolean');
  });

  it('clipboard.writeText resolves (no throw) even without permission', async () => {
    const ctx = createBrowserContext();
    await expect(ctx.clipboard.writeText('hi')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/runtime/browser-context.ts`**

```ts
import type { ToolContext, NotifyResult } from '@/tools/types';
import { InMemoryFs } from '@/utils/in-memory-fs';

// Optional sandbox loading: callers that need fs (downloads example) pass the
// already-loaded fixture record. Most UI usage doesn't execute fs tools live.
export function createBrowserContext(fsFixture?: Record<string, { size: number; mtime: string }>): ToolContext {
  return {
    fs: fsFixture ? new InMemoryFs(fsFixture) : undefined,
    notify: async ({ title, body }): Promise<NotifyResult> => {
      if (typeof Notification === 'undefined') {
        return { delivered: false, channel: 'toast' };
      }
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
        return { delivered: true, channel: 'system' };
      }
      // 'denied' or 'default' -> caller shows an in-page toast; we don't request
      // permission here because that needs a user gesture (see design §8).
      return { delivered: false, channel: 'toast' };
    },
    clipboard: {
      writeText: async (s: string) => {
        try {
          if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(s);
        } catch {
          // clipboard requires a user gesture / permission; swallow — the UI
          // offers a manual copy fallback.
        }
      },
    },
    storage: {
      setItem: (k, v) => localStorage.setItem(k, v),
      getItem: (k) => localStorage.getItem(k),
    },
    fetch: globalThis.fetch.bind(globalThis),
  };
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/runtime/browser-context.ts src/runtime/browser-context.test.ts
git commit -m "feat(ui): add browser ToolContext (localStorage/notify/clipboard)"
```

---

## Phase 3: Whiteboard primitives + layout shell

### Task 11: Whiteboard primitives

**Files:** Create `src/components/whiteboard/{ChalkHeading,Card,TokenChip,ProbBar,InkArrow,JsonBlock}.tsx`

These are presentational; verify via build + a Storybook-free smoke render in App later. No unit tests (visual components, per design §12).

- [ ] **Step 1: `ChalkHeading.tsx`**

```tsx
import type { ReactNode } from 'react';

export function ChalkHeading({ children, level = 2 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const sizes = { 1: 'text-4xl md:text-5xl', 2: 'text-2xl md:text-3xl', 3: 'text-xl' };
  const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
  return <Tag className={`font-hand ${sizes[level]} text-whiteboard-ink`}>{children}</Tag>;
}
```

- [ ] **Step 2: `Card.tsx`**

```tsx
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border-2 border-whiteboard-ink/70 bg-white/40 p-4 shadow-[2px_2px_0_0_rgba(26,26,26,0.2)] ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: `TokenChip.tsx`**

```tsx
type Props = {
  text: string;
  id?: number;
  active?: boolean;
  title?: string;
  onHover?: () => void;
};

export function TokenChip({ text, id, active = false, title, onHover }: Props) {
  const display = text.replace(/ /g, '␣').replace(/\n/g, '⏎');
  return (
    <span
      title={title}
      onMouseEnter={onHover}
      className={`inline-flex flex-col items-center rounded-md border px-2 py-1 font-mono text-sm transition-colors ${
        active ? 'border-whiteboard-accent-orange bg-whiteboard-accent-orange/15' : 'border-whiteboard-ink/40 bg-white/50'
      }`}
    >
      <span>{display}</span>
      {id !== undefined && <span className="text-[10px] text-whiteboard-ink/50">{id}</span>}
    </span>
  );
}
```

- [ ] **Step 4: `ProbBar.tsx`**

```tsx
import { motion } from 'framer-motion';

type Props = { token: string; prob: number; max: number; highlight?: boolean };

export function ProbBar({ token, prob, max, highlight = false }: Props) {
  const widthPct = max > 0 ? (prob / max) * 100 : 0;
  const display = token.replace(/ /g, '␣').replace(/\n/g, '⏎');
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 truncate text-right font-mono" title={token}>{display}</span>
      <div className="h-4 flex-1 rounded bg-whiteboard-ink/10">
        <motion.div
          className={`h-full rounded ${highlight ? 'bg-whiteboard-accent-orange' : 'bg-whiteboard-accent-blue'}`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-whiteboard-ink/60">
        {(prob * 100).toFixed(1)}%
      </span>
    </div>
  );
}
```

- [ ] **Step 5: `InkArrow.tsx`**

```tsx
export function InkArrow({ direction = 'right', className = '' }: { direction?: 'right' | 'down'; className?: string }) {
  const rot = direction === 'down' ? 'rotate-90' : '';
  return (
    <svg viewBox="0 0 48 24" className={`h-6 w-12 text-whiteboard-ink/70 ${rot} ${className}`} aria-hidden="true">
      <path d="M2 12 H40 M32 5 L42 12 L32 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 6: `JsonBlock.tsx`**

```tsx
export function JsonBlock({ value, className = '' }: { value: unknown; className?: string }) {
  return (
    <pre className={`overflow-x-auto rounded-md bg-whiteboard-ink/[0.04] p-3 font-mono text-xs leading-relaxed ${className}`}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
```

- [ ] **Step 7: Build + commit**

```bash
npm run build
git add src/components/whiteboard/
git commit -m "feat(ui): add whiteboard primitives (heading/card/chip/probbar/arrow/json)"
```

---

### Task 12: Layout — ProgressBar, LanguageToggle, ExampleSelector, Header

**Files:** Create `src/components/layout/{ProgressBar,LanguageToggle,ExampleSelector,Header}.tsx`

- [ ] **Step 1: `ProgressBar.tsx`**

```tsx
import { motion, useScroll } from 'framer-motion';

export function ProgressBar() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed left-0 top-0 z-50 h-1 origin-left bg-whiteboard-accent-orange"
      style={{ scaleX: scrollYProgress, width: '100%' }}
    />
  );
}
```

- [ ] **Step 2: `LanguageToggle.tsx`**

```tsx
import { useAppStore } from '@/state/store';

export function LanguageToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5"
      aria-label="Toggle language"
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
```

- [ ] **Step 3: `ExampleSelector.tsx`**

```tsx
import { useAppStore } from '@/state/store';
import { EXAMPLES } from '@/examples/registry';
import { useLanguage } from '@/i18n/useLanguage';

export function ExampleSelector() {
  const { lang } = useLanguage();
  const exampleId = useAppStore((s) => s.exampleId);
  const setExample = useAppStore((s) => s.setExample);
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((ex) => (
        <button
          key={ex.id}
          type="button"
          onClick={() => setExample(ex.id)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            ex.id === exampleId
              ? 'border-whiteboard-accent-blue bg-whiteboard-accent-blue text-white'
              : 'border-whiteboard-ink/30 hover:bg-whiteboard-ink/5'
          }`}
        >
          {ex.name[lang]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `Header.tsx`**

```tsx
import { ProgressBar } from './ProgressBar';
import { ExampleSelector } from './ExampleSelector';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '@/i18n/useLanguage';

export function Header() {
  const { t } = useLanguage();
  return (
    <>
      <ProgressBar />
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-whiteboard-ink/15 bg-whiteboard-bg/90 px-4 py-3 backdrop-blur">
        <span className="font-hand text-lg">{t('appTitle')}</span>
        <ExampleSelector />
        <LanguageToggle />
      </header>
    </>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/components/layout/
git commit -m "feat(ui): add header (progress + example selector + language toggle)"
```

---

### Task 13: StationSection shell + LoadingVeil

**Files:** Create `src/components/layout/StationSection.tsx`, `src/components/layout/LoadingVeil.tsx`

- [ ] **Step 1: `LoadingVeil.tsx`**

```tsx
import { useLanguage } from '@/i18n/useLanguage';

export function LoadingVeil({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 py-8 text-whiteboard-ink/50">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-whiteboard-accent-orange" />
      <span className="font-mono text-sm">{message ?? t('loading')}</span>
    </div>
  );
}
```

- [ ] **Step 2: `StationSection.tsx`**

```tsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';

type Props = {
  index: number;
  name: string;
  hook: string;
  children: ReactNode;
};

export function StationSection({ index, name, hook, children }: Props) {
  return (
    <section className="mx-auto min-h-screen max-w-3xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-2 font-mono text-sm text-whiteboard-ink/40">{String(index).padStart(2, '0')}</div>
        <ChalkHeading level={2}>{name}</ChalkHeading>
        <p className="mt-3 font-hand text-xl text-whiteboard-accent-blue">{hook}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/layout/StationSection.tsx src/components/layout/LoadingVeil.tsx
git commit -m "feat(ui): add StationSection shell + LoadingVeil"
```

---

## Phase 4: Stations 1-3 (the probability machine)

### Task 14: Station 1 — Tokenize

**Files:** Create `src/components/stations/Station1Tokenize.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { TokenChip } from '@/components/whiteboard/TokenChip';
import { Card } from '@/components/whiteboard/Card';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { byteToCharRange } from '@/utils/byteToCharRange';

export function Station1Tokenize() {
  const { t } = useLanguage();
  const res = useStationData('tokenize');
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <StationSection index={1} name={t('st1Name')} hook={t('st1Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { prompt, tokens } = res.data;
        const hi = hovered !== null ? byteToCharRange(prompt, tokens[hovered]!.byteRange) : null;
        return (
          <div className="space-y-6">
            <Card>
              <div className="font-mono text-sm leading-loose">
                {hi
                  ? <>
                      <span>{prompt.slice(0, hi[0])}</span>
                      <span className="bg-whiteboard-accent-orange/30">{prompt.slice(hi[0], hi[1])}</span>
                      <span>{prompt.slice(hi[1])}</span>
                    </>
                  : prompt}
              </div>
            </Card>
            <div className="flex flex-wrap gap-2">
              {tokens.map((tok, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}>
                  <TokenChip
                    text={tok.text}
                    id={tok.id}
                    active={hovered === i}
                    title={`bytes ${tok.byteRange[0]}–${tok.byteRange[1]}`}
                    onHover={() => setHovered(i)}
                  />
                </motion.div>
              ))}
            </div>
            <p className="font-mono text-xs text-whiteboard-ink/50">{tokens.length} tokens</p>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station1Tokenize.tsx
git commit -m "feat(ui): add Station 1 Tokenize (hover -> highlight source bytes)"
```

---

### Task 15: Station 2 — Logits

**Files:** Create `src/components/stations/Station2Logits.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { ProbBar } from '@/components/whiteboard/ProbBar';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { softmaxFromLogprobs } from '@/utils/sampling';

export function Station2Logits() {
  const { t } = useLanguage();
  const res = useStationData('logits');
  const [stepIdx, setStepIdx] = useState(0);

  return (
    <StationSection index={2} name={t('st2Name')} hook={t('st2Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const steps = res.data.steps;
        const safeIdx = Math.min(stepIdx, steps.length - 1);
        const step = steps[safeIdx]!;
        const probs = softmaxFromLogprobs(step.topK.map((k) => k.logprob));
        const max = Math.max(...probs);
        return (
          <div className="space-y-5">
            <Card>
              <div className="mb-1 font-mono text-xs text-whiteboard-ink/50">…{step.contextPreview}</div>
              <div className="font-mono text-sm">next token? →</div>
            </Card>
            <div className="space-y-1.5">
              {step.topK.map((k, i) => (
                <ProbBar key={i} token={k.token} prob={probs[i]!} max={max} highlight={i === 0} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={steps.length - 1} value={safeIdx}
                onChange={(e) => setStepIdx(Number(e.target.value))}
                className="flex-1 accent-whiteboard-accent-orange"
              />
              <span className="font-mono text-xs text-whiteboard-ink/60">step {safeIdx + 1}/{steps.length}</span>
            </div>
            <p className="font-mono text-xs text-whiteboard-ink/40">
              {t('st2Hook')}
            </p>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station2Logits.tsx
git commit -m "feat(ui): add Station 2 Logits (top-20 bars + step slider)"
```

---

### Task 16: Station 3 — Sampling (interactive)

**Files:** Create `src/components/stations/Station3Sampling.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { ProbBar } from '@/components/whiteboard/ProbBar';
import { TokenChip } from '@/components/whiteboard/TokenChip';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { applyTemperature } from '@/utils/sampling';

export function Station3Sampling() {
  const { t, lang } = useLanguage();
  const res = useStationData('sampling');
  const [temp, setTemp] = useState(1);

  return (
    <StationSection index={3} name={t('st3Name')} hook={t('st3Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { baseStepLogprobs, paths } = res.data;
        const probs = applyTemperature(baseStepLogprobs.map((k) => k.logprob), temp);
        const max = Math.max(...probs);
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <label className="font-mono text-sm">{t('temperature')}: {temp.toFixed(2)}</label>
                <input
                  type="range" min={0} max={2} step={0.05} value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="flex-1 accent-whiteboard-accent-orange"
                />
              </div>
              <div className="space-y-1.5">
                {baseStepLogprobs.map((k, i) => (
                  <ProbBar key={i} token={k.token} prob={probs[i]!} max={max} highlight={i === 0} />
                ))}
              </div>
              <p className="mt-2 font-mono text-xs text-whiteboard-ink/40">
                {lang === 'zh' ? '温度只作用在可见 top-20 内部' : 'temperature only re-weights the visible top-20'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paths.map((p) => (
                <Card key={p.method}>
                  <div className="mb-2 font-mono text-xs uppercase text-whiteboard-accent-blue">{p.method}</div>
                  <div className="flex flex-wrap gap-1">
                    {p.tokens.slice(0, 18).map((tk, i) => <TokenChip key={i} text={tk} />)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station3Sampling.tsx
git commit -m "feat(ui): add Station 3 Sampling (temperature slider + 4 real paths)"
```

---

## Phase 5: Stations 4-7 (token → command → execution → loop)

### Task 17: Station 4 — Function Call

**Files:** Create `src/components/stations/Station4FunctionCall.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { InkArrow } from '@/components/whiteboard/InkArrow';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { formatPct } from '@/utils/format';
import { softmaxFromLogprobs } from '@/utils/sampling';

export function Station4FunctionCall() {
  const { t } = useLanguage();
  const res = useStationData('function-calls');
  const [showCandidates, setShowCandidates] = useState(false);

  return (
    <StationSection index={4} name={t('st4Name')} hook={t('st4Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { reasoning, toolCandidates, call } = res.data;
        const probs = softmaxFromLogprobs(toolCandidates.map((c) => c.logprob));
        return (
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Card>
              <div className="mb-1 font-mono text-xs text-whiteboard-ink/50">{t('thoughtLabel')}</div>
              <p className="text-sm leading-relaxed">{reasoning}</p>
              <button type="button" onClick={() => setShowCandidates((v) => !v)} className="mt-3 text-xs text-whiteboard-accent-blue underline">
                {t('showTopCandidates')}
              </button>
              {showCandidates && (
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {toolCandidates.map((c, i) => (
                    <li key={i} className="flex justify-between"><span>{c.name}</span><span className="text-whiteboard-ink/50">{formatPct(probs[i]!)}</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <InkArrow direction="right" className="hidden md:block" />
            <Card className="border-whiteboard-accent-orange">
              <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}</div>
              <JsonBlock value={call} />
            </Card>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station4FunctionCall.tsx
git commit -m "feat(ui): add Station 4 Function Call (reasoning -> call card + candidates)"
```

---

### Task 18: Station 5 — Tool Execution

**Files:** Create `src/components/stations/Station5Execution.tsx`

Reads the FIRST reactive iteration from `topology` (per design: Station 5 shows one tool call → observation).

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { InkArrow } from '@/components/whiteboard/InkArrow';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station5Execution() {
  const { t } = useLanguage();
  const res = useStationData('topology');
  const [expanded, setExpanded] = useState(false);

  return (
    <StationSection index={5} name={t('st5Name')} hook={t('st5Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const first = res.data.reactive.iterations[0];
        if (!first) return <Card>{t('dataUnavailable')}</Card>;
        return (
          <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Card className="border-whiteboard-accent-orange">
              <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}</div>
              <JsonBlock value={first.action} />
            </Card>
            <InkArrow direction="right" className="mt-8 hidden md:block" />
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <Card>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-whiteboard-ink/50">{t('observationLabel')}</span>
                  <span className="rounded bg-whiteboard-ink/10 px-1.5 py-0.5 font-mono text-[10px]">📦 sandbox / 🌐 cached</span>
                </div>
                <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-whiteboard-accent-blue underline">
                  {expanded ? '–' : '+'} {t('observationLabel')}
                </button>
                {expanded && <JsonBlock value={first.observation} className="mt-2 max-h-72 overflow-y-auto" />}
                <p className="mt-3 text-xs text-whiteboard-ink/50">{t('st5Hook')}</p>
              </Card>
            </motion.div>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station5Execution.tsx
git commit -m "feat(ui): add Station 5 Tool Execution (call -> observation card)"
```

---

### Task 19: Station 6 — Agent Loop

**Files:** Create `src/components/stations/Station6AgentLoop.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station6AgentLoop() {
  const { t } = useLanguage();
  const res = useStationData('topology');
  const [step, setStep] = useState(1);

  return (
    <StationSection index={6} name={t('st6Name')} hook={t('st6Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const loop = res.data.reactive;
        const shown = Math.min(step, loop.iterations.length);
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep((s) => Math.min(s + 1, loop.iterations.length))} className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5">
                {t('stepForward')} ▶
              </button>
              <span className="font-mono text-xs text-whiteboard-ink/60">{shown}/{loop.iterations.length}</span>
            </div>
            <div className="space-y-3">
              {loop.iterations.slice(0, shown).map((it, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <div className="font-mono text-xs text-whiteboard-ink/50">{t('thoughtLabel')} #{i + 1}</div>
                    {it.thought && <p className="my-1 text-sm">{it.thought}</p>}
                    <div className="mt-2 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}: {it.action.name}</div>
                    <JsonBlock value={it.action.arguments} className="mt-1" />
                  </Card>
                </motion.div>
              ))}
            </div>
            {shown === loop.iterations.length && (
              <Card className="border-whiteboard-accent-blue">
                <div className="font-mono text-xs text-whiteboard-accent-blue">■ {loop.terminationReason}</div>
                <p className="mt-1 text-sm">{loop.terminationNote}</p>
                {loop.finalText && <p className="mt-2 text-sm text-whiteboard-ink/70">{loop.finalText}</p>}
              </Card>
            )}
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station6AgentLoop.tsx
git commit -m "feat(ui): add Station 6 Agent Loop (step-through iterations)"
```

---

### Task 20: Station 7 — Topology (reactive vs deliberative)

**Files:** Create `src/components/stations/Station7Topology.tsx`

- [ ] **Step 1: Implement**

```tsx
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station7Topology() {
  const { t } = useLanguage();
  const res = useStationData('topology');

  return (
    <StationSection index={7} name={t('st7Name')} hook={t('st7Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { reactive, deliberative } = res.data;
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="mb-2 font-mono text-sm text-whiteboard-accent-blue">{t('reactiveLabel')}</div>
              <ol className="space-y-1.5 text-sm">
                {reactive.iterations.map((it, i) => (
                  <li key={i} className="font-mono text-xs"><span className="text-whiteboard-ink/40">{i + 1}.</span> {it.action.name}</li>
                ))}
              </ol>
              <div className="mt-2 font-mono text-[10px] text-whiteboard-ink/40">■ {reactive.terminationReason}</div>
            </Card>
            <Card>
              <div className="mb-2 font-mono text-sm text-whiteboard-accent-orange">{t('deliberativeLabel')}</div>
              <div className="mb-2 text-xs text-whiteboard-ink/60">plan:</div>
              <ol className="space-y-1 text-sm">
                {deliberative.plan.map((p, i) => (
                  <li key={p.id} className="text-xs">{i + 1}. {p.stepLabel}</li>
                ))}
              </ol>
              <div className="mt-3 mb-1 text-xs text-whiteboard-ink/60">execution:</div>
              <ol className="space-y-1">
                {deliberative.execution.map((e, i) => (
                  <li key={i} className={`font-mono text-xs ${e.deviated ? 'text-whiteboard-accent-orange' : ''}`}>
                    {i + 1}. {e.actualCall.name}{e.deviated ? ' ⚠︎' : ''}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-whiteboard-ink/60">{deliberative.deviationSummary}</p>
            </Card>
          </div>
        );
      })()}
    </StationSection>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/stations/Station7Topology.tsx
git commit -m "feat(ui): add Station 7 Topology (reactive vs deliberative)"
```

---

## Phase 6: Epilogue + compose App + polish

### Task 21: Epilogue

**Files:** Create `src/components/layout/Epilogue.tsx`

- [ ] **Step 1: Implement**

```tsx
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useLanguage } from '@/i18n/useLanguage';

const REPO = 'https://github.com/BozhengLong/from-tokens-to-tools';

export function Epilogue() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-3xl px-4 py-32 text-center">
      <ChalkHeading level={1}>{t('epilogueTitle')}</ChalkHeading>
      <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('epilogueBody')}</p>
      <div className="mt-10 flex justify-center gap-6 font-mono text-sm">
        <a className="text-whiteboard-accent-blue underline" href={REPO} target="_blank" rel="noreferrer">{t('linkSource')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/blob/main/docs/recording-notes.md`} target="_blank" rel="noreferrer">{t('linkRecording')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/tree/main/docs/superpowers/specs`} target="_blank" rel="noreferrer">{t('linkSpec')}</a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/layout/Epilogue.tsx
git commit -m "feat(ui): add Epilogue (closing + 3 links)"
```

---

### Task 22: Compose App (intro + all stations + epilogue)

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Header } from '@/components/layout/Header';
import { Epilogue } from '@/components/layout/Epilogue';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { Station1Tokenize } from '@/components/stations/Station1Tokenize';
import { Station2Logits } from '@/components/stations/Station2Logits';
import { Station3Sampling } from '@/components/stations/Station3Sampling';
import { Station4FunctionCall } from '@/components/stations/Station4FunctionCall';
import { Station5Execution } from '@/components/stations/Station5Execution';
import { Station6AgentLoop } from '@/components/stations/Station6AgentLoop';
import { Station7Topology } from '@/components/stations/Station7Topology';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppStore } from '@/state/store';
import { getExample } from '@/examples/registry';

export default function App() {
  const { t, lang } = useLanguage();
  const exampleId = useAppStore((s) => s.exampleId);
  const task = getExample(exampleId).taskPrompt[lang];
  return (
    <div className="bg-whiteboard-bg text-whiteboard-ink font-sans">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ChalkHeading level={1}>{t('appTitle')}</ChalkHeading>
        <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('subtitle')}</p>
        <p className="mt-8 font-mono text-sm text-whiteboard-ink/50">▼</p>
        <div className="mt-8 inline-block rounded-lg border-2 border-whiteboard-ink/30 bg-white/40 px-4 py-2 font-mono text-sm">
          {task}
        </div>
      </section>
      {/* key remounts all stations on example/language switch, resetting each
          station's local interaction state (temperature, step counters). */}
      <div key={`${exampleId}-${lang}`}>
        <Station1Tokenize />
        <Station2Logits />
        <Station3Sampling />
        <Station4FunctionCall />
        <Station5Execution />
        <Station6AgentLoop />
        <Station7Topology />
      </div>
      <Epilogue />
    </div>
  );
}
```

- [ ] **Step 2: Build + run dev server smoke check**

```bash
npm run build
# brief runtime check: start dev server in background, curl the page, kill it
npm run dev -- --port 5180 &
DEV_PID=$!
sleep 4
curl -sS http://localhost:5180/ | grep -q "root" && echo "PAGE OK"
kill $DEV_PID 2>/dev/null
```
Expected: build succeeds, "PAGE OK".

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): compose App — intro + 7 stations + epilogue"
```

---

### Task 23: Fonts (self-hosted, lazy for en)

**Files:** Create `src/styles/fonts.css`; modify `src/index.css`; add font files under `public/fonts/`

- [ ] **Step 1: Download fonts to `public/fonts/`**

```bash
mkdir -p public/fonts
# Inter Variable (OFL), Patrick Hand (OFL), Caveat (OFL) — fetch woff2 from a CDN mirror
curl -sSL -o public/fonts/inter-var.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2"
curl -sSL -o public/fonts/patrick-hand.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/patrick-hand@latest/latin-400-normal.woff2"
curl -sSL -o public/fonts/caveat-var.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/caveat:vf@latest/latin-wght-normal.woff2"
ls -la public/fonts/
```
Expected: three .woff2 files, each > 10KB. If a URL 404s, find the current fontsource path at https://fontsource.org and substitute; note the substitution.

- [ ] **Step 2: Create `src/styles/fonts.css`**

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/inter-var.woff2') format('woff2');
}
@font-face {
  font-family: 'Patrick Hand';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/patrick-hand.woff2') format('woff2');
}
@font-face {
  font-family: 'Caveat';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/caveat-var.woff2') format('woff2');
}
```

- [ ] **Step 3: Import fonts in `src/index.css`** (add at top, after the tailwind import)

```css
@import './styles/fonts.css';
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add public/fonts/ src/styles/fonts.css src/index.css
git commit -m "feat(ui): self-host Inter + Patrick Hand + Caveat fonts"
```

---

### Task 24: prefers-reduced-motion + final verification

**Files:** Modify `src/index.css`

- [ ] **Step 1: Add reduced-motion guard to `src/index.css`**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Full verification**

```bash
npm test
npm run build
```
Expected: all tests pass; build succeeds.

- [ ] **Step 3: Manual visual check via dev server**

```bash
npm run dev -- --port 5181 &
DEV_PID=$!
sleep 4
echo "Open http://localhost:5181/ and verify: header switches example+language; stations 1-7 render; Station 3 temperature slider re-weights bars; Station 6 step button advances."
# leave running for manual check, then:
# kill $DEV_PID
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): respect prefers-reduced-motion"
```

---

### Task 25: Push + tag

- [ ] **Step 1: Final test + build**

```bash
npm test && npm run build
```

- [ ] **Step 2: Push + tag**

```bash
git push origin main
git tag plan-b-complete -m "Plan B: frontend demo complete"
git push origin plan-b-complete
```

- [ ] **Step 3: Report inventory**

```bash
echo "stations: $(ls src/components/stations | wc -l)"
git log --oneline | head -30
```

---

## End of Plan B

Plan B produces the full working demo: a scrollable, bilingual, 7-station whiteboard narrative driven by Plan A's recorded data, deployable as a static build.

**Deferred to a possible Plan C (not in scope):** KaTeX formula in Station 3, the "🔄 refresh from live" button wired to `browser-context`, the `save_*` real side-effects in the browser (copy button / notification / localStorage rec), deep mobile gesture polish, deployment to a host.
