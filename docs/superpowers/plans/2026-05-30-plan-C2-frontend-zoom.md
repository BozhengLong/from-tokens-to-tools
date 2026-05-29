# Plan C2: v2 Frontend Zoom Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two-axis semantic-zoom front end (Structure Y) that turns Plan C1's recorded data into a navigable journey — pan through the hero story, zoom into any beat to the live/recorded token microscope — and deploy it.

**Architecture:** React 19 + Vite 8 + Tailwind v4 + Zustand 5 + Zod 4 + framer-motion. A `useStoryData` hook loads + Zod-validates `story.json`/`token-fallback.json`. A Zustand store holds nav state `(panIndex, zoomDepth, hasDescended)` + lang. A `ZoomStage` component renders the current beat at the current depth with animated scale/crossfade transitions; `Next/Back` pans, `zoom in/out` changes depth. Beat content renders per-kind; the deepest level of a `model-speaks` beat mounts a `TokenMicroscope` UI backed by C1's `RecordedMicroscope` (default) or `LiveMicroscope` (opt-in, self-hosted SmolLM2-135M same-origin). Reuses v1 whiteboard primitives + i18n.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (CSS-first `@theme`), Zustand 5, Zod 4, framer-motion, `@huggingface/transformers` (already installed). vitest 4 + `@testing-library/react` + jsdom (installed in v1).

**Reference:** Spec `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-v2-zoom-design.md`. Plan C1 is complete (tag `plan-c1-complete`).

**Builds on C1 (do not redefine — import these):**
- `@/types/v2-schemas`: `StoryRunSchema`, `TokenFallbackSchema`, types `StoryRun`, `Beat`, `ZoomContent`, `ZoomLevel`, `TokenFallback`.
- `@/microscope/types`: `TokenMicroscope`, `MicroscopeStep`, `TokenizedPiece`.
- `@/microscope/dist`: `TokenProb`, `topKFromLogits`, `sampleIndex`.
- `@/microscope/recorded`: `RecordedMicroscope` (`new RecordedMicroscope(tokenFallback, beatId)`).
- `@/microscope/live`: `LiveMicroscope.create(modelId?, onProgress?)`.
- Data: `src/data/v2/fix-failing-test/story.json` (8 beats, bilingual inline), `token-fallback.json` (beats `b1`,`b3`).
- v1 whiteboard primitives in `src/components/whiteboard/`: `Card`, `ChalkHeading`, `ProbBar`, `TokenChip`, `InkArrow`, `JsonBlock`. v1 i18n in `src/i18n/` (`STRINGS`, `useLanguage`).

**Conventions (from v1/C1):** strict TS (`import type`; no unused vars; `_`-prefix intentionally-unused params; `erasableSyntaxOnly` ON → no TS parameter-properties); `@`=`src/`; vitest include already `['src/**/*.test.ts','scripts/**/*.test.ts']`; jsdom via `// @vitest-environment jsdom` docblock. Commit each task separately with the exact message + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (HEREDOC `-F -`). Never commit weights (gitignored). `npm test` + `npm run build` stay green.

**v1 vs v2 entry:** v2 replaces the app entry. `src/App.tsx` becomes the v2 journey. v1's components stay on disk (tag `plan-b-complete`) but are no longer mounted.

---

## File Structure

```
src/
├── App.tsx                              # REWRITE: v2 journey (Task 16)
├── state/v2-store.ts                    # NEW: nav store (Task 2) + .test.ts
├── hooks/
│   ├── useStoryData.ts                  # NEW: load+validate story.json (Task 3) + .test.ts
│   └── useMicroscope.ts                 # NEW: recorded/live microscope lifecycle (Task 11) + .test.ts
├── i18n/v2-strings.ts                   # NEW: v2 UI copy zh/en (Task 4) + .test.ts
├── components/v2/
│   ├── ZoomStage.tsx                    # NEW: semantic-zoom engine (Task 7)
│   ├── Breadcrumb.tsx                   # NEW: beat i/N + depth (Task 6)
│   ├── BeatCard.tsx                     # NEW: L0 beat view per kind (Task 8)
│   ├── ZoomLevelView.tsx                # NEW: render a zoom level L1..L3 (Task 9)
│   ├── Callout.tsx                      # NEW: "look here" pointer (Task 9)
│   ├── TokenMicroscopeView.tsx          # NEW: deepest layer UI (Task 12)
│   ├── SourceHandoff.tsx                # NEW: Claude→SmolLM honesty banner (Task 10)
│   ├── DistributionBars.tsx             # NEW: top-k bars (wraps v1 ProbBar) (Task 5)
│   ├── Intro.tsx                        # NEW: landing + task framing (Task 15)
│   ├── Epilogue.tsx                     # NEW: closing (Task 15)
│   └── controls/NavControls.tsx         # NEW: Next/Back/zoom buttons + keys (Task 13)
└── utils/probFromTopK.ts                # NEW: logprob[] -> display probs (Task 5) + .test.ts
public/models/                           # self-hosted weights (gitignored; Task 14)
```

---

## Phase 1: Data + state + i18n foundation

### Task 1: Mount a blank v2 App shell

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-whiteboard-bg text-whiteboard-ink font-sans">
      <h1 className="p-8 font-hand text-3xl">from tokens to tools — v2</h1>
    </main>
  );
}
```

- [ ] **Step 2: Build** — `npm run build` (green).
- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -F - <<'EOF'
chore(v2 ui): blank v2 App shell (v1 journey retired to tag plan-b-complete)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: Nav store

**Files:** Create `src/state/v2-store.ts`, `src/state/v2-store.test.ts`

- [ ] **Step 1: Write failing test `src/state/v2-store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useV2Store } from './v2-store';

describe('useV2Store', () => {
  beforeEach(() => useV2Store.setState({ exampleId: 'fix-failing-test', lang: 'zh', panIndex: 0, zoomDepth: 0, hasDescended: false }));

  it('next advances panIndex and resets zoomDepth', () => {
    useV2Store.getState().zoomIn(3);
    useV2Store.getState().next(8);
    const s = useV2Store.getState();
    expect(s.panIndex).toBe(1);
    expect(s.zoomDepth).toBe(0);
  });

  it('next is clamped at beatCount-1', () => {
    useV2Store.setState({ panIndex: 7 });
    useV2Store.getState().next(8);
    expect(useV2Store.getState().panIndex).toBe(7);
  });

  it('back decrements and clamps at 0; resets zoomDepth', () => {
    useV2Store.setState({ panIndex: 0, zoomDepth: 2 });
    useV2Store.getState().back();
    expect(useV2Store.getState().panIndex).toBe(0);
    expect(useV2Store.getState().zoomDepth).toBe(0);
  });

  it('zoomIn increments up to maxDepth and sets hasDescended', () => {
    useV2Store.getState().zoomIn(2);
    expect(useV2Store.getState().zoomDepth).toBe(1);
    expect(useV2Store.getState().hasDescended).toBe(true);
    useV2Store.getState().zoomIn(2);
    useV2Store.getState().zoomIn(2); // clamp
    expect(useV2Store.getState().zoomDepth).toBe(2);
  });

  it('zoomOut decrements, clamped at 0', () => {
    useV2Store.setState({ zoomDepth: 1 });
    useV2Store.getState().zoomOut();
    expect(useV2Store.getState().zoomDepth).toBe(0);
    useV2Store.getState().zoomOut();
    expect(useV2Store.getState().zoomDepth).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- src/state/v2-store.test.ts`

- [ ] **Step 3: Implement `src/state/v2-store.ts`**

```ts
import { create } from 'zustand';

export type Lang = 'zh' | 'en';

type V2State = {
  exampleId: string;
  lang: Lang;
  panIndex: number;   // which beat
  zoomDepth: number;  // 0 = macro card; 1..N = into beat.zoom.levels[0..N-1]
  hasDescended: boolean; // has the user zoomed at least once (guided first descent)
  next: (beatCount: number) => void;
  back: () => void;
  zoomIn: (maxDepth: number) => void;
  zoomOut: () => void;
  setLang: (lang: Lang) => void;
  setExample: (id: string) => void;
};

const LANG_KEY = 'ftt2-lang';
const readLang = (): Lang => {
  try { if (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY) === 'en') return 'en'; } catch { /* ignore */ }
  return 'zh';
};

export const useV2Store = create<V2State>((set) => ({
  exampleId: 'fix-failing-test',
  lang: readLang(),
  panIndex: 0,
  zoomDepth: 0,
  hasDescended: false,
  next: (beatCount) => set((s) => ({ panIndex: Math.min(s.panIndex + 1, beatCount - 1), zoomDepth: 0 })),
  back: () => set((s) => ({ panIndex: Math.max(s.panIndex - 1, 0), zoomDepth: 0 })),
  zoomIn: (maxDepth) => set((s) => ({ zoomDepth: Math.min(s.zoomDepth + 1, maxDepth), hasDescended: true })),
  zoomOut: () => set((s) => ({ zoomDepth: Math.max(s.zoomDepth - 1, 0) })),
  setLang: (lang) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ } set({ lang }); },
  setExample: (id) => set({ exampleId: id, panIndex: 0, zoomDepth: 0, hasDescended: false }),
}));
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- src/state/v2-store.test.ts`
- [ ] **Step 5: Commit**

```bash
git add src/state/v2-store.ts src/state/v2-store.test.ts
git commit -F - <<'EOF'
feat(v2 ui): add nav store (pan/zoom/lang)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: `useStoryData` loader (validate at load)

**Files:** Create `src/hooks/useStoryData.ts`, `src/hooks/useStoryData.test.ts`

- [ ] **Step 1: Write failing test `src/hooks/useStoryData.test.ts`**

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStoryData } from './useStoryData';

describe('useStoryData', () => {
  it('loads + validates the hero story and its token fallback', async () => {
    const { result } = renderHook(() => useStoryData('fix-failing-test'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.story.beats.length).toBe(8);
      expect(result.current.tokenFallback.b1).toBeTruthy();
      expect(result.current.story.beats[0]!.kind).toBe('user');
    }
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/hooks/useStoryData.ts`**

```ts
import { useEffect, useState } from 'react';
import { StoryRunSchema, TokenFallbackSchema, type StoryRun, type TokenFallback } from '@/types/v2-schemas';

type Result =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; story: StoryRun; tokenFallback: TokenFallback };

// Static globs so Vite bundles/splits the JSON per scenario.
const STORIES = import.meta.glob('../data/v2/*/story.json');
const FALLBACKS = import.meta.glob('../data/v2/*/token-fallback.json');

export function useStoryData(exampleId: string) {
  const [state, setState] = useState<Result>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      try {
        const storyLoader = STORIES[`../data/v2/${exampleId}/story.json`];
        if (!storyLoader) throw new Error(`no story.json for ${exampleId}`);
        const story = StoryRunSchema.parse(((await storyLoader()) as { default: unknown }).default);
        const fbLoader = FALLBACKS[`../data/v2/${exampleId}/token-fallback.json`];
        const tokenFallback = fbLoader
          ? TokenFallbackSchema.parse(((await fbLoader()) as { default: unknown }).default)
          : {};
        if (!cancelled) setState({ status: 'ready', story, tokenFallback });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [exampleId]);
  return state;
}
```

- [ ] **Step 4: Run, verify PASS**
- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStoryData.ts src/hooks/useStoryData.test.ts
git commit -F - <<'EOF'
feat(v2 ui): add useStoryData (lazy import + Zod validation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: v2 i18n strings + parity test

**Files:** Create `src/i18n/v2-strings.ts`, `src/i18n/v2-strings.test.ts`

- [ ] **Step 1: Write failing parity test `src/i18n/v2-strings.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { V2_STRINGS } from './v2-strings';

describe('V2_STRINGS', () => {
  it('zh and en have identical keys', () => {
    expect(Object.keys(V2_STRINGS.zh).sort()).toEqual(Object.keys(V2_STRINGS.en).sort());
  });
  it('no empty values', () => {
    for (const lang of ['zh', 'en'] as const)
      for (const [k, v] of Object.entries(V2_STRINGS[lang])) expect(v, `${lang}.${k}`).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement `src/i18n/v2-strings.ts`**

```ts
import type { Lang } from '@/state/v2-store';

type Dict = Record<string, string>;

const zh: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: '看一个真实的 AI agent 修好一段代码 —— 然后钻进任意一步,发现它只是在猜下一个字。',
  start: '开始 ↓',
  next: '下一步 →',
  back: '← 上一步',
  lookInside: '🔍 钻进去看里面',
  backToMap: '↑ 回到地图',
  beat: '步骤',
  depth: '深度',
  lookInsideHint: '👇 看懂了?钻进去看它到底在干什么',
  loadLiveModel: '加载实时模型(~178MB,在你电脑上跑)',
  loadingModel: '正在加载模型…',
  liveReady: '✅ 实时模型已就绪 —— 这是在你自己的电脑上跑',
  liveFailed: '实时模型加载失败,已切回录制数据',
  recordedBadge: '📼 录制的真实数据',
  liveBadge: '🔬 实时 · 你的设备',
  temperature: '温度',
  resample: '重新采样',
  yourPrompt: '上下文(可改)',
  nextTokenTitle: '模型对“下一个 token”的真实打分',
  epilogueTitle: '没有魔法,只有约定。',
  epilogueBody: '逐字预测 + 一套“长这样就算命令”的约定 + 运行时执行 + 循环到模型说停 —— 叠起来,就是一个能改你代码的 agent。',
  linkSource: '源码',
  linkRecording: '数据怎么来的',
  langToggle: 'EN',
  dataUnavailable: '数据未就绪',
};

const en: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: 'Watch a real AI agent fix a bug — then zoom into any step and find it was only ever guessing the next token.',
  start: 'Start ↓',
  next: 'Next →',
  back: '← Back',
  lookInside: '🔍 Look inside',
  backToMap: '↑ Back to the map',
  beat: 'step',
  depth: 'depth',
  lookInsideHint: '👇 Got it? Zoom in to see what it is really doing',
  loadLiveModel: 'Load the live model (~178MB, runs on your machine)',
  loadingModel: 'Loading the model…',
  liveReady: '✅ Live model ready — running on your own machine',
  liveFailed: 'Live model failed to load; using recorded data',
  recordedBadge: '📼 recorded real data',
  liveBadge: '🔬 live · your device',
  temperature: 'temperature',
  resample: 'Resample',
  yourPrompt: 'context (editable)',
  nextTokenTitle: "the model's real scores for the next token",
  epilogueTitle: 'No magic, just conventions.',
  epilogueBody: 'Token-by-token prediction + a "this shape counts as a command" convention + a runtime that executes + a loop until the model says stop — stacked together, that is an agent that edits your code.',
  linkSource: 'Source',
  linkRecording: 'How the data was made',
  langToggle: '中文',
  dataUnavailable: 'data unavailable',
};

export const V2_STRINGS: Record<Lang, Dict> = { zh, en };
export type V2Key = keyof typeof zh;

export function useV2Strings(lang: Lang) {
  return (key: V2Key): string => V2_STRINGS[lang][key];
}
```

- [ ] **Step 4: Run, verify PASS**; **Step 5: Commit**

```bash
git add src/i18n/v2-strings.ts src/i18n/v2-strings.test.ts
git commit -F - <<'EOF'
feat(v2 ui): add v2 i18n strings (zh/en) with parity test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 2: Distribution bars + breadcrumb (small reusable bits)

### Task 5: `probFromTopK` util + `DistributionBars`

**Files:** Create `src/utils/probFromTopK.ts`, `src/utils/probFromTopK.test.ts`, `src/components/v2/DistributionBars.tsx`

- [ ] **Step 1: Write failing test `src/utils/probFromTopK.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { probFromTopK } from './probFromTopK';

describe('probFromTopK', () => {
  it('softmaxes logprobs within the visible top-k (sums ~1)', () => {
    const probs = probFromTopK([-0.84, -1.10, -3.57, -4.01]);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(probs[0]).toBeGreaterThan(probs[1]!);
  });
});
```

- [ ] **Step 2: Run FAIL. Step 3: Implement `src/utils/probFromTopK.ts`**

```ts
import { softmaxFromLogprobs } from './sampling';
// Re-normalize the recorded top-k logprobs into a display distribution over just
// the visible tokens (so the bars sum to 1 within the top-k). See design §2 token layer.
export function probFromTopK(logprobs: number[]): number[] {
  return softmaxFromLogprobs(logprobs);
}
```

- [ ] **Step 4: Run PASS.**

- [ ] **Step 5: Implement `src/components/v2/DistributionBars.tsx`** (reuses v1 `ProbBar`)

```tsx
import { ProbBar } from '@/components/whiteboard/ProbBar';
import type { TokenProb } from '@/microscope/dist';
import { probFromTopK } from '@/utils/probFromTopK';

export function DistributionBars({ topK, highlightToken }: { topK: TokenProb[]; highlightToken?: string }) {
  const probs = probFromTopK(topK.map((t) => t.logprob));
  const max = Math.max(...probs);
  return (
    <div className="space-y-1.5">
      {topK.map((t, i) => (
        <ProbBar key={i} token={t.token} prob={probs[i]!} max={max} highlight={t.token === highlightToken} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/utils/probFromTopK.ts src/utils/probFromTopK.test.ts src/components/v2/DistributionBars.tsx
git commit -F - <<'EOF'
feat(v2 ui): add probFromTopK + DistributionBars (top-k probability bars)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: Breadcrumb

**Files:** Create `src/components/v2/Breadcrumb.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useV2Store } from '@/state/v2-store';
import { useV2Strings } from '@/i18n/v2-strings';

export function Breadcrumb({ beatCount }: { beatCount: number }) {
  const { lang, panIndex, zoomDepth } = useV2Store();
  const t = useV2Strings(lang);
  return (
    <div className="fixed left-4 top-4 z-50 rounded-full border border-whiteboard-ink/20 bg-whiteboard-bg/90 px-3 py-1 font-mono text-xs text-whiteboard-ink/60 backdrop-blur">
      {t('beat')} {panIndex + 1}/{beatCount}
      {zoomDepth > 0 && <span className="ml-2 text-whiteboard-accent-orange">{t('depth')} L{zoomDepth}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/Breadcrumb.tsx
git commit -F - <<'EOF'
feat(v2 ui): add Breadcrumb (beat i/N + zoom depth)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 3: Beat rendering

### Task 7: `BeatCard` — the L0 macro view per beat kind

**Files:** Create `src/components/v2/BeatCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Beat } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';

const KIND_BADGE: Record<Beat['kind'], string> = {
  user: '🧑 you', 'model-speaks': '🤖 model speaks', 'runtime-acts': '⚙️ runtime acts', final: '🏁 done',
};

export function BeatCard({ beat, lang }: { beat: Beat; lang: Lang }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-2 font-mono text-xs uppercase text-whiteboard-ink/40">{KIND_BADGE[beat.kind]}</div>
      <ChalkHeading level={2}>{beat.title[lang]}</ChalkHeading>
      <p className="mt-3 text-lg text-whiteboard-ink/80">{beat.summary[lang]}</p>
      {beat.thought && beat.kind !== 'user' && (
        <p className="mt-3 border-l-2 border-whiteboard-ink/20 pl-3 font-mono text-sm text-whiteboard-ink/60">{beat.thought}</p>
      )}
      {beat.toolCall && (
        <div className="mt-3">
          <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">→ {beat.toolCall.name}</div>
          <JsonBlock value={beat.toolCall.arguments} />
        </div>
      )}
      {beat.observation && (
        <pre className="mt-3 max-h-56 overflow-auto rounded bg-whiteboard-ink/[0.05] p-3 font-mono text-xs leading-relaxed">{beat.observation}</pre>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/BeatCard.tsx
git commit -F - <<'EOF'
feat(v2 ui): add BeatCard (L0 macro view per beat kind)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 8: `Callout` + `ZoomLevelView` (renders L1..L3 content)

**Files:** Create `src/components/v2/Callout.tsx`, `src/components/v2/ZoomLevelView.tsx`

- [ ] **Step 1: `Callout.tsx`**

```tsx
import type { Lang } from '@/state/v2-store';
import type { ZoomLevel } from '@/types/v2-schemas';

export function Callout({ callout, lang }: { callout: NonNullable<ZoomLevel['callouts']>[number]; lang: Lang }) {
  return (
    <div className="mt-2 inline-block rounded-md border-2 border-dashed border-whiteboard-accent-orange/70 px-3 py-1 font-hand text-sm text-whiteboard-accent-orange">
      {callout.label[lang]}
    </div>
  );
}
```

- [ ] **Step 2: `ZoomLevelView.tsx`** (the microscope is injected as `deepest` so this stays presentational)

```tsx
import type { ReactNode } from 'react';
import type { ZoomLevel } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { Card } from '@/components/whiteboard/Card';
import { Callout } from './Callout';

export function ZoomLevelView({ level, lang, deepest }: { level: ZoomLevel; lang: Lang; deepest?: ReactNode }) {
  return (
    <Card className="mx-auto max-w-2xl border-whiteboard-accent-blue/40">
      <div className="mb-1 font-mono text-xs uppercase text-whiteboard-accent-blue">L{level.level}</div>
      <ChalkHeading level={3}>{level.title[lang]}</ChalkHeading>
      <p className="mt-2 leading-relaxed text-whiteboard-ink/80">{level.body[lang]}</p>
      {level.callouts?.map((c, i) => <Callout key={i} callout={c} lang={lang} />)}
      {deepest && <div className="mt-4">{deepest}</div>}
    </Card>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/v2/Callout.tsx src/components/v2/ZoomLevelView.tsx
git commit -F - <<'EOF'
feat(v2 ui): add ZoomLevelView + Callout (render a zoom level)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 4: Token microscope (recorded default + opt-in live)

### Task 9: Source-handoff banner

**Files:** Create `src/components/v2/SourceHandoff.tsx`

- [ ] **Step 1: Implement** (honesty requirement from spec §4)

```tsx
import type { Lang } from '@/state/v2-store';

const COPY: Record<Lang, string> = {
  zh: 'Claude 不公开它的概率。所以这里换成一个你能看穿的小开源模型(SmolLM2-135M),在你的设备上跑——机制完全一样,只是这个能看见内部。',
  en: "Claude doesn't expose its probabilities. So here we swap in a small open model you can see inside (SmolLM2-135M), running on your device — same mechanism, just inspectable.",
};

export function SourceHandoff({ lang }: { lang: Lang }) {
  return (
    <div className="mb-3 rounded-md border-l-4 border-whiteboard-accent-orange bg-whiteboard-accent-orange/10 px-3 py-2 text-sm text-whiteboard-ink/80">
      {COPY[lang]}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/SourceHandoff.tsx
git commit -F - <<'EOF'
feat(v2 ui): add SourceHandoff banner (Claude->SmolLM honesty)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 10: `useMicroscope` hook (recorded default; load live on demand)

**Files:** Create `src/hooks/useMicroscope.ts`, `src/hooks/useMicroscope.test.ts`

- [ ] **Step 1: Write failing test `src/hooks/useMicroscope.test.ts`** (recorded path is node/jsdom-testable; live path is browser-only and not unit-tested)

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMicroscope } from './useMicroscope';
import type { TokenFallback } from '@/types/v2-schemas';

const fb: TokenFallback = {
  b1: { model: 'm', prompt: 'p', steps: [{ chosen: 'x', topK: [{ token: 'x', id: 1, logprob: -0.5 }] }] },
};

describe('useMicroscope (recorded default)', () => {
  it('exposes recorded steps for a beat without loading any model', async () => {
    const { result } = renderHook(() => useMicroscope(fb, 'b1'));
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    expect(result.current.mode).toBe('recorded');
    expect(result.current.steps[0]!.topK[0]!.token).toBe('x');
  });
});
```

- [ ] **Step 2: Run FAIL. Step 3: Implement `src/hooks/useMicroscope.ts`**

```ts
import { useEffect, useRef, useState } from 'react';
import type { TokenFallback } from '@/types/v2-schemas';
import type { MicroscopeStep, TokenMicroscope } from '@/microscope/types';
import { RecordedMicroscope } from '@/microscope/recorded';

type Mode = 'recorded' | 'loading-live' | 'live' | 'live-failed';

const MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct';

export function useMicroscope(fallback: TokenFallback, beatId: string, seedContext?: string) {
  const [mode, setMode] = useState<Mode>('recorded');
  const [steps, setSteps] = useState<MicroscopeStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const liveRef = useRef<TokenMicroscope | null>(null); // holds the live instance across renders
  const seed = seedContext ?? fallback[beatId]?.prompt ?? '';

  // recorded default — from the captured data; always works, no model load
  useEffect(() => {
    let cancelled = false;
    setMode('recorded');
    liveRef.current = null;
    new RecordedMicroscope(fallback, beatId).generateSteps('', 8, 0).then((s) => { if (!cancelled) setSteps(s); });
    return () => { cancelled = true; };
  }, [fallback, beatId]);

  // opt-in live load (browser only). Lazy-imports the live backend so it isn't bundled
  // until the user asks; on success, regenerate steps live from the seed context.
  const loadLive = async () => {
    setMode('loading-live');
    try {
      const { LiveMicroscope } = await import('@/microscope/live');
      const m = await LiveMicroscope.create(MODEL_ID, setProgress);
      liveRef.current = m;
      setSteps(await m.generateSteps(seed, 8, temperature));
      setMode('live');
    } catch {
      setMode('live-failed'); // stay on the recorded steps
    }
  };

  const resample = async (temp: number) => {
    setTemperature(temp);
    if (liveRef.current) setSteps(await liveRef.current.generateSteps(seed, 8, temp));
  };

  return { mode, steps, progress, temperature, loadLive, resample };
}
```

NOTE: the recorded path is the shipped baseline and the only thing unit-tested; the live path is browser-only (verify manually in Task 16). `liveRef` (a `useRef`) holds the `LiveMicroscope` so `resample` works across renders. Keep `import('@/microscope/live')` lazy so the model code isn't bundled until opt-in.

- [ ] **Step 4: Run PASS** (recorded test). **Step 5: Commit**

```bash
git add src/hooks/useMicroscope.ts src/hooks/useMicroscope.test.ts
git commit -F - <<'EOF'
feat(v2 ui): add useMicroscope (recorded default + lazy opt-in live)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 11: `TokenMicroscopeView`

**Files:** Create `src/components/v2/TokenMicroscopeView.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import type { Lang } from '@/state/v2-store';
import type { TokenFallback } from '@/types/v2-schemas';
import { useMicroscope } from '@/hooks/useMicroscope';
import { useV2Strings } from '@/i18n/v2-strings';
import { DistributionBars } from './DistributionBars';
import { SourceHandoff } from './SourceHandoff';
import { TokenChip } from '@/components/whiteboard/TokenChip';

export function TokenMicroscopeView({ fallback, beatId, seedContext, lang }: {
  fallback: TokenFallback; beatId: string; seedContext?: string; lang: Lang;
}) {
  const t = useV2Strings(lang);
  const { mode, steps, progress, temperature, loadLive, resample } = useMicroscope(fallback, beatId, seedContext);
  const [stepIdx, setStepIdx] = useState(0);
  if (!steps.length) return null;
  const safe = Math.min(stepIdx, steps.length - 1);
  const step = steps[safe]!;
  const isLive = mode === 'live';

  return (
    <div className="rounded-lg border border-whiteboard-ink/20 bg-white/40 p-4">
      <SourceHandoff lang={lang} />
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-whiteboard-ink/60">{t('nextTokenTitle')}</span>
        <span className="rounded bg-whiteboard-ink/10 px-2 py-0.5 font-mono text-[10px]">{isLive ? t('liveBadge') : t('recordedBadge')}</span>
      </div>

      {/* the running context + the token chosen so far */}
      <div className="mb-2 font-mono text-xs text-whiteboard-ink/50">…{(seedContext ?? fallback[beatId]?.prompt ?? '').slice(-44)}</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {steps.slice(0, safe + 1).map((s, i) => <TokenChip key={i} text={s.chosen.token} active={i === safe} />)}
      </div>

      <DistributionBars topK={step.topK} highlightToken={step.chosen.token} />

      <div className="mt-3 flex items-center gap-3">
        <input type="range" min={0} max={steps.length - 1} value={safe} onChange={(e) => setStepIdx(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
        <span className="font-mono text-xs text-whiteboard-ink/50">{safe + 1}/{steps.length}</span>
      </div>

      {mode === 'recorded' && (
        <button type="button" onClick={loadLive} className="mt-4 rounded border border-whiteboard-accent-blue px-3 py-1.5 text-sm text-whiteboard-accent-blue hover:bg-whiteboard-accent-blue/10">
          {t('loadLiveModel')}
        </button>
      )}
      {mode === 'loading-live' && <p className="mt-4 font-mono text-sm text-whiteboard-ink/60">{t('loadingModel')} {Math.round(progress)}%</p>}
      {mode === 'live-failed' && <p className="mt-4 font-mono text-sm text-whiteboard-accent-orange">{t('liveFailed')}</p>}
      {isLive && (
        <div className="mt-4">
          <p className="mb-1 font-mono text-sm text-whiteboard-accent-blue">{t('liveReady')}</p>
          <label className="flex items-center gap-2 font-mono text-sm">{t('temperature')}: {temperature.toFixed(2)}
            <input type="range" min={0} max={2} step={0.05} value={temperature} onChange={(e) => resample(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/TokenMicroscopeView.tsx
git commit -F - <<'EOF'
feat(v2 ui): add TokenMicroscopeView (recorded bars + opt-in live resampling)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 5: ZoomStage engine + controls + compose

### Task 12: `NavControls`

**Files:** Create `src/components/v2/controls/NavControls.tsx`

- [ ] **Step 1: Implement** (Next/Back pan; Look-inside/Back-to-map zoom; keyboard arrows)

```tsx
import { useEffect } from 'react';
import type { Beat } from '@/types/v2-schemas';
import { useV2Store } from '@/state/v2-store';
import { useV2Strings } from '@/i18n/v2-strings';

export function NavControls({ beats }: { beats: Beat[] }) {
  const { lang, panIndex, zoomDepth, hasDescended, next, back, zoomIn, zoomOut } = useV2Store();
  const t = useV2Strings(lang);
  const beat = beats[panIndex]!;
  const maxDepth = beat.zoom ? beat.zoom.levels.length : 0;
  const canZoomIn = zoomDepth < maxDepth;
  const firstModelBeat = beats.findIndex((b) => b.kind === 'model-speaks');
  const nudgeDescend = !hasDescended && panIndex === firstModelBeat && zoomDepth === 0 && maxDepth > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next(beats.length);
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'ArrowDown' && canZoomIn) zoomIn(maxDepth);
      else if (e.key === 'ArrowUp') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beats.length, canZoomIn, maxDepth, next, back, zoomIn, zoomOut]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-whiteboard-ink/20 bg-whiteboard-bg/95 px-3 py-2 shadow-[2px_2px_0_0_rgba(26,26,26,0.15)] backdrop-blur">
      <button type="button" onClick={back} className="rounded px-3 py-1 text-sm hover:bg-whiteboard-ink/10">{t('back')}</button>
      {canZoomIn ? (
        <button type="button" onClick={() => zoomIn(maxDepth)} className={`rounded border px-3 py-1 text-sm ${nudgeDescend ? 'animate-pulse border-whiteboard-accent-orange bg-whiteboard-accent-orange/15 text-whiteboard-accent-orange' : 'border-whiteboard-accent-blue text-whiteboard-accent-blue'}`}>{t('lookInside')}</button>
      ) : zoomDepth > 0 ? (
        <button type="button" onClick={zoomOut} className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5">{t('backToMap')}</button>
      ) : null}
      <button type="button" onClick={() => next(beats.length)} className={`rounded px-3 py-1 text-sm hover:bg-whiteboard-ink/10 ${nudgeDescend ? 'opacity-40' : ''}`}>{t('next')}</button>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/controls/NavControls.tsx
git commit -F - <<'EOF'
feat(v2 ui): add NavControls (pan/zoom buttons + arrow keys + guided-descent nudge)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 13: `ZoomStage` engine (keystone)

**Files:** Create `src/components/v2/ZoomStage.tsx`

Renders the current beat at the current zoom depth, animating scale+crossfade on depth/pan change. Depth 0 → `BeatCard`; depth d≥1 → `ZoomLevelView` for `beat.zoom.levels[d-1]`, and at the deepest level of a beat that has `tokenFallbackRef`, inject `TokenMicroscopeView`.

- [ ] **Step 1: Implement**

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import type { Beat, TokenFallback } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { useV2Store } from '@/state/v2-store';
import { BeatCard } from './BeatCard';
import { ZoomLevelView } from './ZoomLevelView';
import { TokenMicroscopeView } from './TokenMicroscopeView';

export function ZoomStage({ beats, tokenFallback, lang }: { beats: Beat[]; tokenFallback: TokenFallback; lang: Lang }) {
  const { panIndex, zoomDepth } = useV2Store();
  const beat = beats[panIndex]!;
  const atLevel = zoomDepth > 0 && beat.zoom ? beat.zoom.levels[zoomDepth - 1] : null;
  const isDeepest = !!beat.zoom && zoomDepth === beat.zoom.levels.length;
  const ref = beat.zoom?.tokenFallbackRef;
  const microscope = isDeepest && ref
    ? <TokenMicroscopeView fallback={tokenFallback} beatId={ref.split('#')[1]!} seedContext={beat.zoom?.seedContext} lang={lang} />
    : null;

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${panIndex}-${zoomDepth}`}
          initial={{ opacity: 0, scale: zoomDepth > 0 ? 0.92 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: zoomDepth > 0 ? 1.04 : 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full"
        >
          {atLevel ? <ZoomLevelView level={atLevel} lang={lang} deepest={microscope} /> : <BeatCard beat={beat} lang={lang} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/ZoomStage.tsx
git commit -F - <<'EOF'
feat(v2 ui): add ZoomStage engine (semantic zoom: pan + depth, animated)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 14: Self-host weights into `public/models`

**Files:** Modify `scripts/v2/prefetch-model.ts` (target `public/models`); add `public/models/` to `.gitignore`; add an npm script.

- [ ] **Step 1: Point the prefetch at `public/models`** — change the `env.cacheDir` line in `scripts/v2/prefetch-model.ts`:

```ts
// serve same-origin from /models in dev + prod
env.cacheDir = new URL('../../public/models', import.meta.url).pathname;
```

- [ ] **Step 2: gitignore + npm script**

Add to `.gitignore`:
```
public/models/
```
Add to `package.json` scripts:
```json
"prefetch:model": "NODE_USE_ENV_PROXY=1 tsx scripts/v2/prefetch-model.ts"
```

- [ ] **Step 3: Run it** — `npm run prefetch:model` → confirms files at `public/models/HuggingFaceTB/SmolLM2-135M-Instruct/...`. (Dev server serves them at `/models/...`; `LiveMicroscope` uses `localModelPath='/models'`.)

- [ ] **Step 4: Commit (config only; weights are gitignored)**

```bash
git add scripts/v2/prefetch-model.ts .gitignore package.json package-lock.json 2>/dev/null
git commit -F - <<'EOF'
chore(v2 ui): self-host model weights under public/models (gitignored)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 15: Intro + Epilogue

**Files:** Create `src/components/v2/Intro.tsx`, `src/components/v2/Epilogue.tsx`

- [ ] **Step 1: `Intro.tsx`**

```tsx
import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useV2Strings } from '@/i18n/v2-strings';

export function Intro({ lang, taskPrompt }: { lang: Lang; taskPrompt: string }) {
  const t = useV2Strings(lang);
  return (
    <section className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <ChalkHeading level={1}>{t('appTitle')}</ChalkHeading>
      <p className="mt-6 text-lg text-whiteboard-ink/70">{t('subtitle')}</p>
      <div className="mt-8 rounded-lg border-2 border-whiteboard-ink/30 bg-white/40 px-4 py-2 font-mono text-sm">{taskPrompt}</div>
      <p className="mt-10 font-mono text-sm text-whiteboard-ink/40">{t('start')}</p>
    </section>
  );
}
```

- [ ] **Step 2: `Epilogue.tsx`**

```tsx
import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useV2Strings } from '@/i18n/v2-strings';

const REPO = 'https://github.com/BozhengLong/from-tokens-to-tools';

export function Epilogue({ lang }: { lang: Lang }) {
  const t = useV2Strings(lang);
  return (
    <section className="mx-auto max-w-2xl px-4 py-32 text-center">
      <ChalkHeading level={1}>{t('epilogueTitle')}</ChalkHeading>
      <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('epilogueBody')}</p>
      <div className="mt-10 flex justify-center gap-6 font-mono text-sm">
        <a className="text-whiteboard-accent-blue underline" href={REPO} target="_blank" rel="noreferrer">{t('linkSource')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/blob/main/docs/recording-notes.md`} target="_blank" rel="noreferrer">{t('linkRecording')}</a>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/v2/Intro.tsx src/components/v2/Epilogue.tsx
git commit -F - <<'EOF'
feat(v2 ui): add Intro + Epilogue

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 16: Compose `App.tsx` — the hero journey

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useV2Store } from '@/state/v2-store';
import { useStoryData } from '@/hooks/useStoryData';
import { useV2Strings } from '@/i18n/v2-strings';
import { Intro } from '@/components/v2/Intro';
import { Epilogue } from '@/components/v2/Epilogue';
import { ZoomStage } from '@/components/v2/ZoomStage';
import { NavControls } from '@/components/v2/controls/NavControls';
import { Breadcrumb } from '@/components/v2/Breadcrumb';

export default function App() {
  const { exampleId, lang, panIndex, setLang } = useV2Store();
  const t = useV2Strings(lang);
  const res = useStoryData(exampleId);

  return (
    <div className="bg-whiteboard-bg text-whiteboard-ink font-sans">
      <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        className="fixed right-4 top-4 z-50 rounded border border-whiteboard-ink/30 bg-whiteboard-bg/90 px-3 py-1 text-sm backdrop-blur">{t('langToggle')}</button>

      {res.status === 'loading' && <div className="flex min-h-screen items-center justify-center font-mono text-whiteboard-ink/50">…</div>}
      {res.status === 'error' && <div className="flex min-h-screen items-center justify-center">{t('dataUnavailable')}</div>}
      {res.status === 'ready' && (() => {
        const { story, tokenFallback } = res;
        const taskPrompt = story.beats[0]?.summary[lang] ?? '';
        return (
          <>
            <Breadcrumb beatCount={story.beats.length} />
            {/* Intro shows only at the very start (beat 0) for a clean landing */}
            {panIndex === 0 ? <Intro lang={lang} taskPrompt={taskPrompt} /> : null}
            <ZoomStage beats={story.beats} tokenFallback={tokenFallback} lang={lang} />
            {panIndex === story.beats.length - 1 ? <Epilogue lang={lang} /> : null}
            <NavControls beats={story.beats} />
          </>
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 2: Build + dev smoke check**

```bash
npm run build
npm run prefetch:model   # ensure /models is populated for the live button
npm run dev -- --port 5193 &
DEV=$!; sleep 4
curl -sS http://localhost:5193/ | grep -q "root" && echo "PAGE OK"
kill $DEV 2>/dev/null
```
Expected: build green, "PAGE OK".

- [ ] **Step 3: Manual browser check (the real acceptance)** — `npm run dev -- --port 5193`, open in Chrome/Edge. Verify: intro renders; **Next** pans through the 8 beats; on a `model-speaks` beat **Look inside** zooms L1→L2→L3; at L3 the **TokenMicroscopeView** shows recorded bars; **Load the live model** downloads from `/models` and switches to live with a working temperature slider; **Back to the map** zooms out; language toggle works; arrow keys pan/zoom. Note anything off.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -F - <<'EOF'
feat(v2 ui): compose hero journey — intro + ZoomStage + controls + epilogue

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 17: prefers-reduced-motion + final hero verification

**Files:** Modify `src/index.css` (the v1 reduced-motion block already exists — verify it covers framer-motion via the `transition-duration` override; framer-motion respects `useReducedMotion`, but the CSS guard is the backstop).

- [ ] **Step 1: Confirm `src/index.css` has the `@media (prefers-reduced-motion: reduce)` block from v1.** If absent, add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 2: Full verification**

```bash
npm test
npm run build
npx tsx scripts/v2/validate-v2.ts
```
Expected: all tests pass (v1 56 + C1 + C2 new), build green, v2 data valid.

- [ ] **Step 3: Commit (if index.css changed)**

```bash
git add src/index.css
git commit -F - <<'EOF'
feat(v2 ui): ensure reduced-motion guard covers the zoom transitions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Phase 6: Scale to the other two scenarios + deploy

> Reuses the proven C1 flow (capture → harvest → curate → validate) + the C2 components unchanged. Each scenario is data-only work; the journey UI already renders any valid `StoryRun`.

### Task 18: Example switcher

**Files:** Create `src/components/v2/ExampleSwitcher.tsx`; modify `src/App.tsx` to mount it.

- [ ] **Step 1: Implement `ExampleSwitcher.tsx`**

```tsx
import { useV2Store } from '@/state/v2-store';

const EXAMPLES: { id: string; label: { zh: string; en: string } }[] = [
  { id: 'fix-failing-test', label: { zh: '修复测试', en: 'Fix a test' } },
  { id: 'clean-big-files', label: { zh: '清理大文件', en: 'Clean big files' } },
  { id: 'error-recovery', label: { zh: '出错恢复', en: 'Error recovery' } },
];

export function ExampleSwitcher() {
  const { exampleId, lang, setExample } = useV2Store();
  return (
    <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 gap-2">
      {EXAMPLES.map((e) => (
        <button key={e.id} type="button" onClick={() => setExample(e.id)}
          className={`rounded-full border px-3 py-1 text-xs ${e.id === exampleId ? 'border-whiteboard-accent-blue bg-whiteboard-accent-blue text-white' : 'border-whiteboard-ink/30 bg-whiteboard-bg/90 backdrop-blur'}`}>
          {e.label[lang]}
        </button>
      ))}
    </div>
  );
}
```
Mount `<ExampleSwitcher />` inside the `ready` branch of `App.tsx` (next to `<Breadcrumb>`). The `key` on the journey wrapper should include `exampleId` so it remounts on switch (or rely on the store reset in `setExample`).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/v2/ExampleSwitcher.tsx src/App.tsx
git commit -F - <<'EOF'
feat(v2 ui): add example switcher (3 scenarios)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 19: Capture + curate `clean-big-files`

**Files:** Create `sandboxes/clean-big-files/` (a fixture dir with some large + small files, or a script that makes them), `src/data/v2/clean-big-files/{raw-transcript.jsonl, story.json, token-fallback.json}`.

- [ ] **Step 1: Create the sandbox** — a dir with a few files of varied sizes (use `truncate`/`mkfile` to make sparse big files, or a `make-fixtures.sh`), so a real `ls -la`/`du` shows >1GB files. Keep the actual big files OUT of git (gitignore them); commit only the generator script + a README.

- [ ] **Step 2: Capture a real Claude Code session** (user-run, same as C1 Task 8): "list the files over 1GB in this folder, biggest first, save a list." Copy its transcript to `src/data/v2/clean-big-files/raw-transcript.jsonl`.

- [ ] **Step 3: Harvest + curate** — `harvestTranscript` the transcript; author `story.json` (bilingual, same beat/zoom shape as the hero, reusing the L1/L2/L3 token-mechanism copy where beats are "model-speaks"); pick 1–2 model-speaks beats to give `seedContext` + `tokenFallbackRef`.

- [ ] **Step 4: Capture token data** — add the new beat seeds to `scripts/v2/capture-token-fallback.ts` `BEATS` (or parameterize it per scenario) and run; output `src/data/v2/clean-big-files/token-fallback.json`.

- [ ] **Step 5: Validate + commit**

```bash
npx tsx scripts/v2/validate-v2.ts
git add sandboxes/clean-big-files/ src/data/v2/clean-big-files/
git commit -F - <<'EOF'
feat(v2): add clean-big-files scenario (captured + curated)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 20: Capture + curate `error-recovery`

**Files:** `sandboxes/error-recovery/` + `src/data/v2/error-recovery/{raw-transcript.jsonl, story.json, token-fallback.json}`.

- [ ] **Step 1: Design a task that forces a recovery** — e.g. a sandbox where the first obvious command fails (a script that exits non-zero / a missing file / a renamed target) so the agent must read the error and change strategy. Keep it real and reproducible.

- [ ] **Step 2: Capture** (user-run) a real Claude Code session that hits the wall and recovers; copy the transcript to `src/data/v2/error-recovery/raw-transcript.jsonl`.

- [ ] **Step 3: Harvest + curate `story.json`** — emphasize the recovery beat (the "it failed → the model reads the failure → tries a different approach" loop), which is this scenario's teaching point (why a loop exists). Add `seedContext` + `tokenFallbackRef` on the pivotal model-speaks beats.

- [ ] **Step 4: Capture token data** for the new beats; output `token-fallback.json`.

- [ ] **Step 5: Validate + commit**

```bash
npx tsx scripts/v2/validate-v2.ts
git add sandboxes/error-recovery/ src/data/v2/error-recovery/
git commit -F - <<'EOF'
feat(v2): add error-recovery scenario (captured + curated)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 21: Accessibility outline mode + small-screen accordion

**Files:** Create `src/components/v2/OutlineMode.tsx`; modify `src/App.tsx` (render OutlineMode when `(prefers-reduced-motion)` OR small viewport OR a toggle).

- [ ] **Step 1: Implement `OutlineMode.tsx`** — render the whole story as nested disclosure sections: each beat is a `<details>` with its `BeatCard`; each zoom level is a nested `<details>` containing `ZoomLevelView` (and the microscope at the deepest model-speaks level). No spatial zoom; everything reachable by keyboard/screen-reader.

```tsx
import type { Beat, TokenFallback } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { BeatCard } from './BeatCard';
import { ZoomLevelView } from './ZoomLevelView';
import { TokenMicroscopeView } from './TokenMicroscopeView';

export function OutlineMode({ beats, tokenFallback, lang }: { beats: Beat[]; tokenFallback: TokenFallback; lang: Lang }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      {beats.map((beat) => (
        <details key={beat.id} open className="rounded-lg border border-whiteboard-ink/15 p-2">
          <summary className="cursor-pointer font-hand text-xl">{beat.title[lang]}</summary>
          <div className="mt-3"><BeatCard beat={beat} lang={lang} /></div>
          {beat.zoom?.levels.map((lvl, i) => {
            const deepest = i === beat.zoom!.levels.length - 1 && beat.zoom!.tokenFallbackRef;
            return (
              <details key={i} className="mt-2 ml-4 border-l-2 border-whiteboard-accent-blue/30 pl-3">
                <summary className="cursor-pointer font-mono text-sm text-whiteboard-accent-blue">L{lvl.level} {lvl.title[lang]}</summary>
                <div className="mt-2">
                  <ZoomLevelView level={lvl} lang={lang}
                    deepest={deepest ? <TokenMicroscopeView fallback={tokenFallback} beatId={beat.zoom!.tokenFallbackRef!.split('#')[1]!} seedContext={beat.zoom!.seedContext} lang={lang} /> : undefined} />
                </div>
              </details>
            );
          })}
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it in `App.tsx`** — add a `useReducedMotionOrSmall()` check (e.g. `window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 640`) and render `<OutlineMode>` instead of `<ZoomStage>`+`<NavControls>` when true. (Keep it simple: compute once on mount.)

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/v2/OutlineMode.tsx src/App.tsx
git commit -F - <<'EOF'
feat(v2 ui): add accessible outline mode (reduced-motion / small-screen fallback)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 22: Deploy config + final verification + push + tag

**Files:** Create `.github/workflows/deploy.yml` (or `vercel.json`); modify `vite.config.ts` (`base`); a deploy README note.

- [ ] **Step 1: Decide host + base.** For GitHub Pages: set `base: '/from-tokens-to-tools/'` in `vite.config.ts`; for a custom domain / Vercel root: `base: '/'`. **The model weights (~178MB) must be served same-origin** — either commit a prefetch step into CI that runs `npm run prefetch:model` before build and uploads `public/models`, or host the weights on a CN-accessible static bucket and point `LiveMicroscope`'s `localModelPath` at that absolute URL. Document the chosen approach.

- [ ] **Step 2: CI workflow** — a GitHub Actions job: checkout → `npm ci` → `npm run prefetch:model` → `npm run build` → deploy `dist/` (Pages or Vercel). (Weights are large; if Pages bandwidth is a concern, host weights externally and skip bundling them.)

- [ ] **Step 3: Full verification**

```bash
npm test && npm run build && npx tsx scripts/v2/validate-v2.ts
```

- [ ] **Step 4: Push + tag**

```bash
git push origin main
git tag plan-c2-complete -m "Plan C2: v2 frontend zoom experience complete"
git push origin plan-c2-complete
```

- [ ] **Step 5: Report inventory** — `git log --oneline | head -30`; confirm the deployed URL loads, the hero journey works, and the live model loads same-origin in a WebGPU browser.

---

## End of Plan C2

C2 produces the full v2 experience: a two-axis semantic-zoom journey over the hero story (pan the beats, zoom to a live/recorded token microscope), the other two scenarios, an accessible fallback, and a deploy. Built hero-first (Tasks 1–17) then scaled (18–22), per the spec's vertical-slice order.

**Notes for the executor:**
- The ZoomStage (Task 13) + useMicroscope live path (Task 10) are the only genuinely novel/uncertain pieces — verify them in a real WebGPU browser (Task 16 Step 3), not just via build. Everything else is standard React.
- `npm run prefetch:model` must be run before the live button works (dev and CI). Weights are gitignored.
- If the live `resample`/instance-holding in `useMicroscope` is fiddly, hold the `LiveMicroscope` in a `useRef`; the recorded default (the shipped baseline) is fully tested and must always work even if live is disabled.
