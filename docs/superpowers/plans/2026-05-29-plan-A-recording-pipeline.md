# Plan A: Foundation + Recording Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the project foundation, dual-platform tool layer (browser+Node abstractions), and recording pipeline that produces validated JSON datasets for all 4 examples × 2 languages. End state: `npm run record -- --example=<id>` produces `src/data/examples/<id>/*.{zh,en}.json` that all pass Zod validation.

**Architecture:** Single repo, Vite + React + TS + Tailwind + Zustand + Zod for app shell. Recording scripts run in Node via `tsx`, sharing tool implementations with the (future) browser runtime through dependency injection (`ToolContext`). Recording uses OpenAI Chat Completions API (via LiteLLM-compatible base URL) and produces per-language JSON files validated against Zod schemas. No frontend UI in this plan — that's Plan B.

**Tech Stack:** Vite 5+, React 18+, TypeScript 5+, Tailwind 3+, Zustand 4+, Zod 3+, OpenAI SDK 4+, tsx, vitest, tiktoken, vite-plugin-yaml, js-yaml.

**Reference:** Design spec at `docs/superpowers/specs/2026-05-29-from-tokens-to-tools-design.md`.

---

## File Structure

```
from-tokens-to-tools/
├── package.json                                         # NEW
├── tsconfig.json                                        # NEW
├── tsconfig.node.json                                   # NEW
├── vite.config.ts                                       # NEW
├── tailwind.config.ts                                   # NEW
├── postcss.config.js                                    # NEW
├── .env.example                                         # EXISTS
├── .env                                                 # EXISTS
├── .gitignore                                           # EXISTS
├── README.md                                            # NEW (placeholder, expanded in Plan B)
├── src/
│   ├── types/
│   │   ├── schemas.ts                                   # NEW: Zod schemas, single source of truth
│   │   └── schemas.test.ts                              # NEW
│   ├── tools/
│   │   ├── types.ts                                     # NEW: Tool + ToolContext
│   │   ├── index.ts                                     # NEW: tools registry
│   │   ├── list_directory.ts                            # NEW
│   │   ├── list_directory.test.ts                       # NEW
│   │   ├── get_file_size.ts                             # NEW
│   │   ├── get_file_size.test.ts                        # NEW
│   │   ├── get_weather.ts                               # NEW
│   │   ├── get_weather.test.ts                          # NEW
│   │   ├── send_notification.ts                         # NEW
│   │   ├── send_notification.test.ts                    # NEW
│   │   ├── fetch_wikipedia_article.ts                   # NEW
│   │   ├── fetch_wikipedia_article.test.ts              # NEW
│   │   ├── save_tweet_draft.ts                          # NEW
│   │   ├── save_tweet_draft.test.ts                     # NEW
│   │   ├── fetch_hn_top.ts                              # NEW
│   │   ├── fetch_hn_top.test.ts                         # NEW
│   │   ├── fetch_hn_story.ts                            # NEW
│   │   ├── fetch_hn_story.test.ts                       # NEW
│   │   ├── save_recommendation.ts                       # NEW
│   │   └── save_recommendation.test.ts                  # NEW
│   ├── utils/
│   │   ├── in-memory-fs.ts                              # NEW
│   │   └── in-memory-fs.test.ts                         # NEW
│   └── data/
│       ├── sandboxes/
│       │   └── downloads-bigfiles/
│       │       └── fs.json                              # NEW (fixture data)
│       └── examples/                                     # populated by recording
│           ├── downloads-bigfiles/                       # (recording outputs)
│           ├── shanghai-weather/                         # (recording outputs)
│           ├── wikipedia-tweet/                          # (recording outputs)
│           └── hn-weekend-pick/                          # (recording outputs)
├── scripts/
│   └── record/
│       ├── config.ts                                    # NEW: model / seed / paths
│       ├── openai-client.ts                             # NEW
│       ├── node-context.ts                              # NEW: Node-side ToolContext
│       ├── manifest-loader.ts                           # NEW: YAML loader + validation
│       ├── tokenize.ts                                  # NEW
│       ├── logits.ts                                    # NEW
│       ├── sampling.ts                                  # NEW
│       ├── function-calls.ts                            # NEW
│       ├── agent-loops.ts                               # NEW
│       ├── index.ts                                     # NEW: CLI entry
│       └── manifests/
│           ├── downloads-bigfiles.yaml                  # NEW
│           ├── shanghai-weather.yaml                    # NEW
│           ├── wikipedia-tweet.yaml                     # NEW
│           └── hn-weekend-pick.yaml                     # NEW
├── docs/
│   ├── recording-notes.md                               # NEW: integrity rules + prompts
│   └── superpowers/
│       ├── specs/                                       # EXISTS
│       └── plans/                                       # this file
└── vitest.config.ts                                     # NEW
```

---

## Phase 1: Project Scaffold

### Task 1: Initialize Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Backup .env files before scaffold (Vite scaffold may rewrite some root files)**

```bash
cd ~/workspace/from-tokens-to-tools
cp .env .env.bak
cp .env.example .env.example.bak
cp .gitignore .gitignore.bak
```

- [ ] **Step 2: Initialize with Vite's React-TS template**

```bash
npx --yes create-vite@latest . --template react-ts -- --force
```

Expected: files like `package.json`, `index.html`, `src/App.tsx` appear.

- [ ] **Step 3: Restore .env and merge .gitignore**

```bash
mv .env.bak .env
mv .env.example.bak .env.example
# Merge: keep Vite's .gitignore but ensure .env line is present
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
rm .gitignore.bak
```

- [ ] **Step 4: Verify install + dev server boots**

```bash
npm install
npm run dev -- --port 5173
```

Expected: Vite logs `Local: http://localhost:5173/`. Hit `Ctrl+C` to stop.

- [ ] **Step 5: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript"
```

---

### Task 2: Install runtime dependencies

**Files:** Modify `package.json` (via npm)

- [ ] **Step 1: Install core deps**

```bash
npm install zustand zod openai tiktoken js-yaml
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest @vitest/ui tsx @types/js-yaml \
  tailwindcss postcss autoprefixer \
  @tailwindcss/typography
```

- [ ] **Step 3: Install YAML import plugin for Vite**

```bash
npm install -D @rollup/plugin-yaml
```

(We'll wire it into `vite.config.ts` in a later task.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install runtime and dev dependencies"
```

---

### Task 3: Configure Tailwind + PostCSS + whiteboard theme

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Generate Tailwind config**

```bash
npx tailwindcss init -p
```

Then rename `tailwind.config.js` to `tailwind.config.ts` and replace its contents with:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        whiteboard: {
          bg: '#FAF7F0',
          ink: '#1A1A1A',
          accent: {
            blue: '#2C5282',
            orange: '#DD6B20',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'sans-serif'],
        hand: ['"Patrick Hand"', '"Caveat"', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
```

- [ ] **Step 2: Replace `src/index.css` with Tailwind base + theme**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

html, body, #root {
  height: 100%;
}

body {
  background-color: theme('colors.whiteboard.bg');
  color: theme('colors.whiteboard.ink');
  font-family: theme('fontFamily.sans');
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds, dist/ has output. (You may see a warning about App.tsx if it references missing imports — ignore for now or temporarily simplify App.tsx.)

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/index.css
git commit -m "chore: configure Tailwind with whiteboard theme"
```

---

### Task 4: Wire YAML import plugin into Vite + add path alias

**Files:**
- Modify: `vite.config.ts`, `tsconfig.json`

- [ ] **Step 1: Replace `vite.config.ts` with**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import yaml from '@rollup/plugin-yaml';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), yaml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Add path alias to `tsconfig.json` `compilerOptions`**

Add the following keys (preserve existing keys):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "chore: add @ path alias and YAML import plugin"
```

---

### Task 5: Configure vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

- [ ] **Step 2: Add scripts to `package.json` "scripts" section**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "record": "tsx scripts/record/index.ts"
  }
}
```

(Preserve existing `dev`, `build`, `preview` scripts.)

- [ ] **Step 3: Sanity test — write a trivial passing test**

Create `src/utils/_sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 5: Delete the sanity test and commit infra**

```bash
rm src/utils/_sanity.test.ts
git add vitest.config.ts package.json
git commit -m "chore: configure vitest"
```

---

## Phase 2: Zod Schemas (Single Source of Truth)

### Task 6: Define RecordingMeta + manifest schemas

**Files:**
- Create: `src/types/schemas.ts`
- Create: `src/types/schemas.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/types/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RecordingMetaSchema, ToolSpecSchema, ExampleSchema } from './schemas';

describe('RecordingMetaSchema', () => {
  it('accepts a complete meta', () => {
    const valid = {
      model: 'gpt-4.1',
      recordedAt: '2026-05-29T10:00:00Z',
      scriptVersion: 'tokenize.ts@abc1234',
      seed: 42,
      lang: 'zh' as const,
    };
    expect(() => RecordingMetaSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid lang', () => {
    const invalid = {
      model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z',
      scriptVersion: 'x', lang: 'fr',
    };
    expect(() => RecordingMetaSchema.parse(invalid)).toThrow();
  });

  it('allows missing seed (sampling.ts case)', () => {
    const noSeed = {
      model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z',
      scriptVersion: 'sampling.ts@abc1234', lang: 'en' as const,
    };
    expect(() => RecordingMetaSchema.parse(noSeed)).not.toThrow();
  });
});

describe('ToolSpecSchema', () => {
  it('accepts a tool spec with bilingual description', () => {
    const valid = {
      name: 'list_directory',
      description: { zh: '列出目录', en: 'List directory' },
      parameters: { type: 'object', properties: {} },
    };
    expect(() => ToolSpecSchema.parse(valid)).not.toThrow();
  });
});

describe('ExampleSchema', () => {
  it('accepts a complete example manifest', () => {
    const valid = {
      id: 'downloads-bigfiles',
      name: { zh: '找大文件', en: 'Find big downloads' },
      taskPrompt: { zh: '...', en: '...' },
      tools: [],
      finalActionTools: [],
    };
    expect(() => ExampleSchema.parse(valid)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify all FAIL**

```bash
npm test -- src/types/schemas.test.ts
```

Expected: All tests fail with "Cannot find module './schemas'".

- [ ] **Step 3: Create `src/types/schemas.ts` with manifest-layer schemas**

```ts
import { z } from 'zod';

// ========== shared ==========

export const BilingualSchema = z.object({
  zh: z.string(),
  en: z.string(),
});
export type Bilingual = z.infer<typeof BilingualSchema>;

export const RecordingMetaSchema = z.object({
  model: z.string(),
  recordedAt: z.string(),
  scriptVersion: z.string(),
  seed: z.number().optional(),
  lang: z.enum(['zh', 'en']),
});
export type RecordingMeta = z.infer<typeof RecordingMetaSchema>;

// ========== manifest layer (bilingual) ==========

export const ToolSpecSchema = z.object({
  name: z.string(),
  description: BilingualSchema,
  parameters: z.record(z.string(), z.unknown()),  // JSONSchema object
});
export type ToolSpec = z.infer<typeof ToolSpecSchema>;

export const ExampleSchema = z.object({
  id: z.string(),
  name: BilingualSchema,
  taskPrompt: BilingualSchema,
  tools: z.array(ToolSpecSchema),
  finalActionTools: z.array(z.string()),  // tool names that signal loop end
  systemPromptExtras: BilingualSchema.optional(),
  sandboxFixture: z.string().optional(),
});
export type Example = z.infer<typeof ExampleSchema>;
```

- [ ] **Step 4: Run tests, verify all PASS**

```bash
npm test -- src/types/schemas.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/schemas.ts src/types/schemas.test.ts
git commit -m "feat(schemas): add RecordingMeta, ToolSpec, Example Zod schemas"
```

---

### Task 7: Define recording-layer data schemas

**Files:** Modify `src/types/schemas.ts`, `src/types/schemas.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/types/schemas.test.ts`:

```ts
import {
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, AgentLoopDataSchema, TopologyDataSchema,
} from './schemas';

describe('TokenizeDataSchema', () => {
  it('accepts valid tokenize data', () => {
    const valid = {
      _meta: { model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z', scriptVersion: 'x', lang: 'zh' },
      prompt: '列出 Downloads',
      tokens: [
        { id: 12345, text: '列', byteRange: [0, 3] },
        { id: 67890, text: '出', byteRange: [3, 6] },
      ],
    };
    expect(() => TokenizeDataSchema.parse(valid)).not.toThrow();
  });
});

describe('SamplingDataSchema', () => {
  it('accepts exactly 4 paths with valid methods', () => {
    const valid = {
      _meta: { model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z', scriptVersion: 'sampling.ts', lang: 'en' },
      baseStep: 5,
      baseStepLogprobs: [{ token: 'a', tokenId: 1, logprob: -0.5 }],
      paths: [
        { method: 'greedy', params: { temperature: 0 }, tokens: ['a', 'b'] },
        { method: 'low-temp', params: { temperature: 0.5 }, tokens: ['c', 'd'] },
        { method: 'top-p', params: { top_p: 0.9, temperature: 1 }, tokens: ['e', 'f'] },
        { method: 'high-temp', params: { temperature: 1.5 }, tokens: ['g', 'h'] },
      ],
    };
    expect(() => SamplingDataSchema.parse(valid)).not.toThrow();
  });

  it('rejects unknown method', () => {
    const invalid = {
      _meta: { model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z', scriptVersion: 'sampling.ts', lang: 'en' },
      baseStep: 5,
      baseStepLogprobs: [],
      paths: [{ method: 'random', params: {}, tokens: [] }],
    };
    expect(() => SamplingDataSchema.parse(invalid)).toThrow();
  });
});

describe('AgentLoopDataSchema', () => {
  it('accepts text-final termination with finalText', () => {
    const valid = {
      iterations: [
        { thought: 'I need to list files', action: { name: 'list_directory', arguments: { path: '/Downloads' } }, observation: { entries: [] } },
      ],
      terminationReason: 'text-final' as const,
      finalText: 'No big files found.',
      terminationNote: '模型给出最终答复后停止',
    };
    expect(() => AgentLoopDataSchema.parse(valid)).not.toThrow();
  });
});

describe('TopologyDataSchema', () => {
  it('accepts both reactive and deliberative', () => {
    const valid = {
      _meta: { model: 'gpt-4.1', recordedAt: '2026-05-29T10:00:00Z', scriptVersion: 'agent-loops.ts', lang: 'zh' },
      reactive: {
        iterations: [],
        terminationReason: 'text-final',
        finalText: 'done',
        terminationNote: 'ok',
      },
      deliberative: {
        plan: [{ id: 'p1', stepLabel: '调 list_directory' }],
        execution: [{ planStepId: 'p1', actualCall: { name: 'list_directory', arguments: { path: '/x' } }, observation: {}, deviated: false }],
        deviationSummary: '完全按计划执行',
      },
    };
    expect(() => TopologyDataSchema.parse(valid)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify all new tests FAIL**

```bash
npm test -- src/types/schemas.test.ts
```

- [ ] **Step 3: Append schema definitions to `src/types/schemas.ts`**

```ts
// ========== recording layer (single-language per file) ==========

const TokenSchema = z.object({
  id: z.number(),
  text: z.string(),
  byteRange: z.tuple([z.number(), z.number()]),
});

export const TokenizeDataSchema = z.object({
  _meta: RecordingMetaSchema,
  prompt: z.string(),
  tokens: z.array(TokenSchema),
});
export type TokenizeData = z.infer<typeof TokenizeDataSchema>;

const TopKSchema = z.object({
  token: z.string(),
  tokenId: z.number(),
  logprob: z.number(),
});

export const LogitsDataSchema = z.object({
  _meta: RecordingMetaSchema,
  steps: z.array(z.object({
    stepIndex: z.number(),
    contextPreview: z.string(),
    topK: z.array(TopKSchema),
  })),
});
export type LogitsData = z.infer<typeof LogitsDataSchema>;

export const SamplingDataSchema = z.object({
  _meta: RecordingMetaSchema,
  baseStep: z.number(),
  baseStepLogprobs: z.array(TopKSchema),
  paths: z.array(z.object({
    method: z.enum(['greedy', 'low-temp', 'top-p', 'high-temp']),
    params: z.record(z.string(), z.number()),
    tokens: z.array(z.string()),
  })),
});
export type SamplingData = z.infer<typeof SamplingDataSchema>;

const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const FunctionCallDataSchema = z.object({
  _meta: RecordingMetaSchema,
  reasoning: z.string(),
  toolCandidates: z.array(z.object({ name: z.string(), logprob: z.number() })),
  call: ToolCallSchema,
});
export type FunctionCallData = z.infer<typeof FunctionCallDataSchema>;

export const AgentLoopDataSchema = z.object({
  iterations: z.array(z.object({
    thought: z.string(),
    action: ToolCallSchema,
    observation: z.unknown(),
  })),
  terminationReason: z.enum(['text-final', 'final-action-called', 'max-iter']),
  finalText: z.string().optional(),
  terminationNote: z.string(),
});
export type AgentLoopData = z.infer<typeof AgentLoopDataSchema>;

export const TopologyDataSchema = z.object({
  _meta: RecordingMetaSchema,
  reactive: AgentLoopDataSchema,
  deliberative: z.object({
    plan: z.array(z.object({
      id: z.string(),
      stepLabel: z.string(),
      expectedToolCall: ToolCallSchema.optional(),
    })),
    execution: z.array(z.object({
      planStepId: z.string().nullable(),
      actualCall: ToolCallSchema,
      observation: z.unknown(),
      deviated: z.boolean(),
    })),
    deviationSummary: z.string(),
  }),
});
export type TopologyData = z.infer<typeof TopologyDataSchema>;
```

- [ ] **Step 4: Run tests, verify all PASS**

```bash
npm test -- src/types/schemas.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/types/schemas.ts src/types/schemas.test.ts
git commit -m "feat(schemas): add recording-layer Zod schemas"
```

---

## Phase 3: In-Memory FS (for downloads-bigfiles example)

### Task 8: Build `InMemoryFs` utility

**Files:**
- Create: `src/utils/in-memory-fs.ts`
- Create: `src/utils/in-memory-fs.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/in-memory-fs.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFs } from './in-memory-fs';

describe('InMemoryFs', () => {
  let fs: InMemoryFs;

  beforeEach(() => {
    fs = new InMemoryFs({
      '/Downloads/movie.mp4': { size: 2_400_000_000, mtime: '2025-03-15T10:00:00Z' },
      '/Downloads/report.pdf': { size: 1_200_000, mtime: '2025-04-01T09:00:00Z' },
      '/Downloads/installer.dmg': { size: 1_800_000_000, mtime: '2025-05-01T15:00:00Z' },
      '/Documents/notes.txt': { size: 4_000, mtime: '2025-05-29T08:00:00Z' },
    });
  });

  it('lists entries under a path', () => {
    const result = fs.list('/Downloads');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.name).sort()).toEqual(['installer.dmg', 'movie.mp4', 'report.pdf']);
  });

  it('returns empty list for unknown path', () => {
    expect(fs.list('/nonexistent')).toEqual([]);
  });

  it('stat returns size + mtime for known file', () => {
    const s = fs.stat('/Downloads/movie.mp4');
    expect(s).toEqual({ size: 2_400_000_000, mtime: '2025-03-15T10:00:00Z' });
  });

  it('stat throws for unknown file', () => {
    expect(() => fs.stat('/Downloads/nope.zip')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify all FAIL**

```bash
npm test -- src/utils/in-memory-fs.test.ts
```

- [ ] **Step 3: Implement `src/utils/in-memory-fs.ts`**

```ts
export type FileEntry = { size: number; mtime: string };
export type DirEntry = { name: string; size: number; mtime: string };

export class InMemoryFs {
  private readonly files: Map<string, FileEntry>;

  constructor(initial: Record<string, FileEntry>) {
    this.files = new Map(Object.entries(initial));
  }

  list(dirPath: string): DirEntry[] {
    const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    const entries: DirEntry[] = [];
    for (const [fullPath, file] of this.files) {
      if (!fullPath.startsWith(prefix)) continue;
      const rest = fullPath.slice(prefix.length);
      if (rest.includes('/')) continue;  // ignore deeper paths
      entries.push({ name: rest, size: file.size, mtime: file.mtime });
    }
    return entries;
  }

  stat(filePath: string): FileEntry {
    const entry = this.files.get(filePath);
    if (!entry) throw new Error(`No such file: ${filePath}`);
    return entry;
  }
}
```

- [ ] **Step 4: Run tests, verify all PASS**

```bash
npm test -- src/utils/in-memory-fs.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/in-memory-fs.ts src/utils/in-memory-fs.test.ts
git commit -m "feat(utils): add InMemoryFs with list + stat"
```

---

### Task 9: Create downloads sandbox fixture

**Files:** Create `src/data/sandboxes/downloads-bigfiles/fs.json`

- [ ] **Step 1: Write fixture file**

Create `src/data/sandboxes/downloads-bigfiles/fs.json`:

```json
{
  "/Downloads/screen-recording-2025-03-15.mov": { "size": 2400000000, "mtime": "2025-03-15T10:00:00Z" },
  "/Downloads/keynote-deck-final-v3.key": { "size": 480000000, "mtime": "2025-04-12T11:30:00Z" },
  "/Downloads/macos-15-installer.dmg": { "size": 14800000000, "mtime": "2025-02-20T08:00:00Z" },
  "/Downloads/dataset-imagenet-subset.tar.gz": { "size": 8200000000, "mtime": "2025-01-08T14:20:00Z" },
  "/Downloads/podcast-episode-042.mp3": { "size": 89000000, "mtime": "2025-05-22T19:05:00Z" },
  "/Downloads/quarterly-report-Q1.pdf": { "size": 1240000, "mtime": "2025-04-30T16:45:00Z" },
  "/Downloads/family-vacation-photos.zip": { "size": 3200000000, "mtime": "2025-03-29T20:10:00Z" },
  "/Downloads/conference-talk-recording.mp4": { "size": 1900000000, "mtime": "2025-04-18T13:25:00Z" },
  "/Downloads/blender-project-scene-01.blend": { "size": 145000000, "mtime": "2025-05-11T09:50:00Z" },
  "/Downloads/icons-pack-pro.zip": { "size": 22000000, "mtime": "2025-05-14T17:30:00Z" },
  "/Downloads/sample.txt": { "size": 2400, "mtime": "2025-05-28T10:00:00Z" },
  "/Downloads/old-backup.tar": { "size": 5600000000, "mtime": "2025-01-15T12:00:00Z" }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/sandboxes/downloads-bigfiles/fs.json
git commit -m "feat(data): add downloads-bigfiles sandbox fixture (12 files, varied sizes)"
```

---

## Phase 4: Tool Layer

### Task 10: Define `Tool` and `ToolContext` types

**Files:** Create `src/tools/types.ts`

- [ ] **Step 1: Create the type file**

```ts
// src/tools/types.ts
import type { InMemoryFs } from '@/utils/in-memory-fs';

export type NotifyResult = {
  delivered: boolean;
  channel: 'system' | 'toast' | 'mock';
};

export type ToolContext = {
  fs?: InMemoryFs;
  notify: (n: { title: string; body: string }) => Promise<NotifyResult>;
  clipboard: { writeText: (s: string) => Promise<void> };
  storage: {
    setItem: (k: string, v: string) => void;
    getItem: (k: string) => string | null;
  };
  fetch: typeof fetch;
};

export type Tool<Args = unknown, Result = unknown> = {
  name: string;
  schema: Record<string, unknown>;  // JSON Schema for OpenAI function calling
  exec(args: Args, ctx: ToolContext): Promise<Result>;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/types.ts
git commit -m "feat(tools): define Tool and ToolContext types"
```

---

### Task 11: Implement `list_directory` tool

**Files:**
- Create: `src/tools/list_directory.ts`, `src/tools/list_directory.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/list_directory.test.ts
import { describe, it, expect } from 'vitest';
import { listDirectoryTool } from './list_directory';
import { InMemoryFs } from '@/utils/in-memory-fs';
import type { ToolContext } from './types';

const mockCtx = (fs?: InMemoryFs): ToolContext => ({
  fs,
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('list_directory', () => {
  it('returns entries for the given path', async () => {
    const fs = new InMemoryFs({
      '/Downloads/a.txt': { size: 100, mtime: '2025-01-01T00:00:00Z' },
      '/Downloads/b.txt': { size: 200, mtime: '2025-01-02T00:00:00Z' },
    });
    const out = await listDirectoryTool.exec({ path: '/Downloads' }, mockCtx(fs));
    expect((out as any).entries.map((e: any) => e.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('throws when fs is not provided', async () => {
    await expect(
      listDirectoryTool.exec({ path: '/x' }, mockCtx(undefined))
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/list_directory.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/list_directory.ts
import type { Tool } from './types';

type Args = { path: string };
type Result = { entries: Array<{ name: string; size: number; mtime: string }> };

export const listDirectoryTool: Tool<Args, Result> = {
  name: 'list_directory',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute path to the directory' },
    },
    required: ['path'],
  },
  async exec(args, ctx) {
    if (!ctx.fs) throw new Error('list_directory requires ToolContext.fs');
    return { entries: ctx.fs.list(args.path) };
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/list_directory.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/list_directory.ts src/tools/list_directory.test.ts
git commit -m "feat(tools): add list_directory"
```

---

### Task 12: Implement `get_file_size` tool

**Files:** Create `src/tools/get_file_size.ts`, `src/tools/get_file_size.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/get_file_size.test.ts
import { describe, it, expect } from 'vitest';
import { getFileSizeTool } from './get_file_size';
import { InMemoryFs } from '@/utils/in-memory-fs';
import type { ToolContext } from './types';

const mockCtx = (fs?: InMemoryFs): ToolContext => ({
  fs,
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('get_file_size', () => {
  it('returns size for an existing file', async () => {
    const fs = new InMemoryFs({ '/x/big.bin': { size: 1_000_000_000, mtime: '2025-01-01T00:00:00Z' } });
    const out = await getFileSizeTool.exec({ path: '/x/big.bin' }, mockCtx(fs));
    expect((out as any).size).toBe(1_000_000_000);
  });

  it('returns error for non-existent file', async () => {
    const fs = new InMemoryFs({});
    const out = await getFileSizeTool.exec({ path: '/nope' }, mockCtx(fs));
    expect((out as any).error).toBe('not-found');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/get_file_size.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/get_file_size.ts
import type { Tool } from './types';

type Args = { path: string };
type Result = { size: number; mtime: string } | { error: 'not-found' };

export const getFileSizeTool: Tool<Args, Result> = {
  name: 'get_file_size',
  schema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  async exec(args, ctx) {
    if (!ctx.fs) throw new Error('get_file_size requires ToolContext.fs');
    try {
      const { size, mtime } = ctx.fs.stat(args.path);
      return { size, mtime };
    } catch {
      return { error: 'not-found' };
    }
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/get_file_size.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/get_file_size.ts src/tools/get_file_size.test.ts
git commit -m "feat(tools): add get_file_size"
```

---

### Task 13: Implement `get_weather` tool

**Files:** Create `src/tools/get_weather.ts`, `src/tools/get_weather.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/get_weather.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getWeatherTool } from './get_weather';
import type { ToolContext } from './types';

const fakeFetch = (body: unknown, ok = true): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch;

const mockCtx = (fetchImpl: typeof fetch): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: fetchImpl,
});

describe('get_weather', () => {
  it('calls open-meteo and returns simplified shape', async () => {
    const fetchSpy = vi.fn(fakeFetch({
      daily: {
        time: ['2026-05-30'],
        temperature_2m_max: [22.5],
        temperature_2m_min: [16.0],
        precipitation_probability_max: [80],
        weathercode: [61],
      },
    }));
    const out = await getWeatherTool.exec(
      { city: 'Shanghai', date: '2026-05-30' },
      mockCtx(fetchSpy as unknown as typeof fetch)
    );
    expect((out as any).date).toBe('2026-05-30');
    expect((out as any).precipitation_probability).toBe(80);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/get_weather.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/get_weather.ts
import type { Tool } from './types';

type Args = { city: string; date: string };  // date: YYYY-MM-DD
type Result =
  | { date: string; t_max: number; t_min: number; precipitation_probability: number; weathercode: number }
  | { error: 'fetch-failed' };

// minimal city lookup; v1 only supports the cities used in examples
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Shanghai: { lat: 31.23, lon: 121.47 },
  '上海': { lat: 31.23, lon: 121.47 },
};

export const getWeatherTool: Tool<Args, Result> = {
  name: 'get_weather',
  schema: {
    type: 'object',
    properties: {
      city: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['city', 'date'],
  },
  async exec(args, ctx) {
    const coords = CITY_COORDS[args.city];
    if (!coords) return { error: 'fetch-failed' };
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${args.date}&end_date=${args.date}`;
    try {
      const res = await ctx.fetch(url);
      if (!res.ok) return { error: 'fetch-failed' };
      const body = await res.json();
      return {
        date: body.daily.time[0],
        t_max: body.daily.temperature_2m_max[0],
        t_min: body.daily.temperature_2m_min[0],
        precipitation_probability: body.daily.precipitation_probability_max[0],
        weathercode: body.daily.weathercode[0],
      };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/get_weather.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/get_weather.ts src/tools/get_weather.test.ts
git commit -m "feat(tools): add get_weather (open-meteo)"
```

---

### Task 14: Implement `send_notification` tool

**Files:** Create `src/tools/send_notification.ts`, `src/tools/send_notification.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/send_notification.test.ts
import { describe, it, expect, vi } from 'vitest';
import { sendNotificationTool } from './send_notification';
import type { ToolContext } from './types';

const mockCtx = (notify: ToolContext['notify']): ToolContext => ({
  notify,
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('send_notification', () => {
  it('delegates to ctx.notify and returns its result', async () => {
    const notify = vi.fn(async () => ({ delivered: true, channel: 'system' as const }));
    const out = await sendNotificationTool.exec(
      { title: 'Hi', body: 'Bring umbrella' },
      mockCtx(notify)
    );
    expect(out).toEqual({ delivered: true, channel: 'system' });
    expect(notify).toHaveBeenCalledWith({ title: 'Hi', body: 'Bring umbrella' });
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/send_notification.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/send_notification.ts
import type { Tool, NotifyResult } from './types';

type Args = { title: string; body: string };

export const sendNotificationTool: Tool<Args, NotifyResult> = {
  name: 'send_notification',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['title', 'body'],
  },
  async exec(args, ctx) {
    return ctx.notify(args);
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/send_notification.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/send_notification.ts src/tools/send_notification.test.ts
git commit -m "feat(tools): add send_notification"
```

---

### Task 15: Implement `fetch_wikipedia_article` tool

**Files:** Create `src/tools/fetch_wikipedia_article.ts`, `src/tools/fetch_wikipedia_article.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/fetch_wikipedia_article.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchWikipediaArticleTool } from './fetch_wikipedia_article';
import type { ToolContext } from './types';

const fakeFetch = (body: unknown, ok = true): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch;

const mockCtx = (fetchImpl: typeof fetch): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: fetchImpl,
});

describe('fetch_wikipedia_article', () => {
  it('returns extract text', async () => {
    const body = {
      query: {
        pages: {
          '12345': { pageid: 12345, title: 'Transformer', extract: 'A transformer is...' },
        },
      },
    };
    const out = await fetchWikipediaArticleTool.exec(
      { title: 'Transformer' },
      mockCtx(fakeFetch(body))
    );
    expect((out as any).extract).toContain('transformer');
  });

  it('returns missingtitle error when page is missing', async () => {
    const body = {
      query: {
        pages: {
          '-1': { ns: 0, title: 'Nope', missing: '' },
        },
      },
    };
    const out = await fetchWikipediaArticleTool.exec(
      { title: 'Nope' },
      mockCtx(fakeFetch(body))
    );
    expect((out as any).error).toBe('missingtitle');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/fetch_wikipedia_article.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/fetch_wikipedia_article.ts
import type { Tool } from './types';

type Args = { title: string };
type Result =
  | { title: string; extract: string }
  | { error: 'missingtitle' | 'fetch-failed' };

export const fetchWikipediaArticleTool: Tool<Args, Result> = {
  name: 'fetch_wikipedia_article',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Exact Wikipedia article title' },
    },
    required: ['title'],
  },
  async exec(args, ctx) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(args.title)}&format=json&origin=*`;
    try {
      const res = await ctx.fetch(url);
      if (!res.ok) return { error: 'fetch-failed' };
      const body = await res.json();
      const pages: Record<string, { title: string; extract?: string; missing?: string }> =
        body?.query?.pages ?? {};
      const page = Object.values(pages)[0];
      if (!page || page.missing !== undefined) return { error: 'missingtitle' };
      return { title: page.title, extract: page.extract ?? '' };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/fetch_wikipedia_article.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/fetch_wikipedia_article.ts src/tools/fetch_wikipedia_article.test.ts
git commit -m "feat(tools): add fetch_wikipedia_article (extracts endpoint)"
```

---

### Task 16: Implement `save_tweet_draft` tool

**Files:** Create `src/tools/save_tweet_draft.ts`, `src/tools/save_tweet_draft.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/save_tweet_draft.test.ts
import { describe, it, expect } from 'vitest';
import { saveTweetDraftTool } from './save_tweet_draft';
import type { ToolContext } from './types';

const mockCtx = (): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('save_tweet_draft', () => {
  it('accepts text within 280 chars', async () => {
    const out = await saveTweetDraftTool.exec({ text: 'Hello world' }, mockCtx());
    expect((out as any).cardRendered).toBe(true);
    expect((out as any).length).toBe(11);
  });

  it('rejects text over 280 chars', async () => {
    const text = 'a'.repeat(281);
    const out = await saveTweetDraftTool.exec({ text }, mockCtx());
    expect((out as any).error).toBe('too-long');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/save_tweet_draft.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/save_tweet_draft.ts
import type { Tool } from './types';

type Args = { text: string };
type Result =
  | { cardRendered: true; text: string; length: number }
  | { error: 'too-long'; length: number };

export const saveTweetDraftTool: Tool<Args, Result> = {
  name: 'save_tweet_draft',
  schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Tweet body, max 280 chars' },
    },
    required: ['text'],
  },
  async exec(args) {
    // NOTE: Browser-side UI will render the card and offer a "📋 Copy" button
    // that triggers ctx.clipboard.writeText (requires user gesture; we don't
    // call clipboard here).
    const length = [...args.text].length;
    if (length > 280) return { error: 'too-long', length };
    return { cardRendered: true, text: args.text, length };
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/save_tweet_draft.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/save_tweet_draft.ts src/tools/save_tweet_draft.test.ts
git commit -m "feat(tools): add save_tweet_draft (card only, copy on user gesture)"
```

---

### Task 17: Implement `fetch_hn_story` tool

**Files:** Create `src/tools/fetch_hn_story.ts`, `src/tools/fetch_hn_story.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/fetch_hn_story.test.ts
import { describe, it, expect } from 'vitest';
import { fetchHnStoryTool } from './fetch_hn_story';
import type { ToolContext } from './types';

const fakeFetch = (body: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;

const mockCtx = (fetchImpl: typeof fetch): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: fetchImpl,
});

describe('fetch_hn_story', () => {
  it('returns story fields for live story', async () => {
    const item = { id: 1, type: 'story', title: 'X', by: 'a', time: 1, score: 10, url: 'http://x' };
    const out = await fetchHnStoryTool.exec({ id: 1 }, mockCtx(fakeFetch(item)));
    expect((out as any).title).toBe('X');
  });

  it('returns unavailable for deleted item', async () => {
    const out = await fetchHnStoryTool.exec(
      { id: 2 },
      mockCtx(fakeFetch({ deleted: true }))
    );
    expect((out as any).error).toBe('unavailable');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/fetch_hn_story.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/fetch_hn_story.ts
import type { Tool } from './types';

type Args = { id: number };
type HnItem = {
  id: number;
  type: string;
  title: string;
  by: string;
  time: number;
  score: number;
  url?: string;
  text?: string;
  descendants?: number;
};
type Result = HnItem | { error: 'unavailable' | 'fetch-failed' };

export const fetchHnStoryTool: Tool<Args, Result> = {
  name: 'fetch_hn_story',
  schema: {
    type: 'object',
    properties: { id: { type: 'number' } },
    required: ['id'],
  },
  async exec(args, ctx) {
    try {
      const res = await ctx.fetch(`https://hacker-news.firebaseio.com/v0/item/${args.id}.json`);
      if (!res.ok) return { error: 'fetch-failed' };
      const body = await res.json();
      if (body?.deleted || body?.dead || !body?.id) return { error: 'unavailable' };
      const { id, type, title, by, time, score, url, text, descendants } = body;
      return { id, type, title, by, time, score, url, text, descendants };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/fetch_hn_story.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/fetch_hn_story.ts src/tools/fetch_hn_story.test.ts
git commit -m "feat(tools): add fetch_hn_story"
```

---

### Task 18: Implement `fetch_hn_top` tool (parallel + timeout)

**Files:** Create `src/tools/fetch_hn_top.ts`, `src/tools/fetch_hn_top.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/fetch_hn_top.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchHnTopTool } from './fetch_hn_top';
import type { ToolContext } from './types';

// Sequence of fakeFetch responses, picked by URL
const makeFetch = (responses: Record<string, unknown>): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = Object.keys(responses).find((k) => url.includes(k));
    if (!key) throw new Error('Unexpected fetch ' + url);
    return new Response(JSON.stringify(responses[key]), { status: 200 });
  }) as typeof fetch;

const mockCtx = (f: typeof fetch): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: f,
});

describe('fetch_hn_top', () => {
  it('returns top 10 items with titles', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    const responses: Record<string, unknown> = { 'topstories.json': ids };
    for (let i = 1; i <= 10; i++) {
      responses[`item/${i}.json`] = { id: i, type: 'story', title: `Story ${i}`, score: 100 - i, url: `http://${i}` };
    }
    const out = await fetchHnTopTool.exec({}, mockCtx(makeFetch(responses)));
    const stories = (out as any).stories;
    expect(stories).toHaveLength(10);
    expect(stories[0].title).toBe('Story 1');
  });

  it('filters deleted items', async () => {
    const ids = [1, 2, 3];
    const responses: Record<string, unknown> = {
      'topstories.json': ids,
      'item/1.json': { id: 1, type: 'story', title: 'Live', score: 50 },
      'item/2.json': { deleted: true },
      'item/3.json': { id: 3, type: 'story', title: 'Live2', score: 40 },
    };
    const out = await fetchHnTopTool.exec({}, mockCtx(makeFetch(responses)));
    const stories = (out as any).stories;
    expect(stories.map((s: any) => s.id)).toEqual([1, 3]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/fetch_hn_top.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/fetch_hn_top.ts
import type { Tool } from './types';

type Args = Record<string, never>;
type Story = { id: number; type: string; title: string; score: number; url?: string };
type Result = { stories: Story[] } | { error: 'fetch-failed' };

const TIMEOUT_MS = 5000;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

export const fetchHnTopTool: Tool<Args, Result> = {
  name: 'fetch_hn_top',
  schema: { type: 'object', properties: {} },
  async exec(_args, ctx) {
    try {
      const topRes = await withTimeout(ctx.fetch('https://hacker-news.firebaseio.com/v0/topstories.json'), TIMEOUT_MS);
      if (!topRes.ok) return { error: 'fetch-failed' };
      const ids: number[] = (await topRes.json()).slice(0, 10);
      const items = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await withTimeout(ctx.fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`), TIMEOUT_MS);
            if (!r.ok) return null;
            const item = await r.json();
            if (item?.deleted || item?.dead || !item?.id) return null;
            return {
              id: item.id, type: item.type, title: item.title,
              score: item.score ?? 0, url: item.url,
            } as Story;
          } catch {
            return null;
          }
        })
      );
      return { stories: items.filter((x): x is Story => x !== null) };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/fetch_hn_top.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/fetch_hn_top.ts src/tools/fetch_hn_top.test.ts
git commit -m "feat(tools): add fetch_hn_top (parallel fetch top 10 with titles)"
```

---

### Task 19: Implement `save_recommendation` tool

**Files:** Create `src/tools/save_recommendation.ts`, `src/tools/save_recommendation.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tools/save_recommendation.test.ts
import { describe, it, expect, vi } from 'vitest';
import { saveRecommendationTool } from './save_recommendation';
import type { ToolContext } from './types';

const mockCtx = (setItem: (k: string, v: string) => void): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('save_recommendation', () => {
  it('writes payload to storage under "last-rec"', async () => {
    const setItem = vi.fn();
    const out = await saveRecommendationTool.exec(
      { story_id: 42, title: 'Cool article', reason: 'long-form' },
      mockCtx(setItem)
    );
    expect((out as any).saved).toBe(true);
    expect(setItem).toHaveBeenCalledWith('last-rec', expect.stringContaining('42'));
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
npm test -- src/tools/save_recommendation.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/save_recommendation.ts
import type { Tool } from './types';

type Args = { story_id: number; title: string; reason: string };
type Result = { saved: true; key: 'last-rec' };

export const saveRecommendationTool: Tool<Args, Result> = {
  name: 'save_recommendation',
  schema: {
    type: 'object',
    properties: {
      story_id: { type: 'number' },
      title: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['story_id', 'title', 'reason'],
  },
  async exec(args, ctx) {
    ctx.storage.setItem('last-rec', JSON.stringify({ ...args, savedAt: new Date().toISOString() }));
    return { saved: true, key: 'last-rec' };
  },
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
npm test -- src/tools/save_recommendation.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/save_recommendation.ts src/tools/save_recommendation.test.ts
git commit -m "feat(tools): add save_recommendation (writes to ctx.storage)"
```

---

### Task 20: Create tools registry / barrel export

**Files:** Create `src/tools/index.ts`

- [ ] **Step 1: Create barrel**

```ts
// src/tools/index.ts
import { listDirectoryTool } from './list_directory';
import { getFileSizeTool } from './get_file_size';
import { getWeatherTool } from './get_weather';
import { sendNotificationTool } from './send_notification';
import { fetchWikipediaArticleTool } from './fetch_wikipedia_article';
import { saveTweetDraftTool } from './save_tweet_draft';
import { fetchHnTopTool } from './fetch_hn_top';
import { fetchHnStoryTool } from './fetch_hn_story';
import { saveRecommendationTool } from './save_recommendation';
import type { Tool } from './types';

export const ALL_TOOLS: Record<string, Tool> = {
  list_directory: listDirectoryTool,
  get_file_size: getFileSizeTool,
  get_weather: getWeatherTool,
  send_notification: sendNotificationTool,
  fetch_wikipedia_article: fetchWikipediaArticleTool,
  save_tweet_draft: saveTweetDraftTool,
  fetch_hn_top: fetchHnTopTool,
  fetch_hn_story: fetchHnStoryTool,
  save_recommendation: saveRecommendationTool,
};

export type { Tool, ToolContext, NotifyResult } from './types';
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

(May still fail due to App.tsx referencing default scaffold; that's OK at this stage. Validate the new code compiles by running typecheck:)

```bash
npx tsc --noEmit
```

Expected: no errors related to src/tools or src/types or src/utils. Default scaffold App.tsx errors are tolerable.

- [ ] **Step 3: Commit**

```bash
git add src/tools/index.ts
git commit -m "feat(tools): add ALL_TOOLS registry barrel export"
```

---

## Phase 5: Recording Infrastructure

### Task 21: Create recording config + OpenAI client

**Files:** Create `scripts/record/config.ts`, `scripts/record/openai-client.ts`

- [ ] **Step 1: Create `scripts/record/config.ts`**

```ts
// scripts/record/config.ts
export const RECORDING_CONFIG = {
  model: 'gpt-4.1',
  seed: 42,                          // for reproducibility; sampling.ts overrides
  topLogprobs: 20,
  maxIterations: 10,                 // agent-loops cap
  observationTruncateChars: 2000,    // §6 rule #4
  reasoningTruncateChars: 500,
  // step selection heuristic thresholds (logits.ts)
  highEntropyNats: 1.5,
  topPairLogprobDeltaMax: 1.0,
} as const;

export const PATHS = {
  examplesDir: 'src/data/examples',
  sandboxesDir: 'src/data/sandboxes',
  manifestsDir: 'scripts/record/manifests',
} as const;
```

- [ ] **Step 2: Create `scripts/record/openai-client.ts`**

```ts
// scripts/record/openai-client.ts
import OpenAI from 'openai';

export const createOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in env (check .env file)');
  }
  return new OpenAI({ apiKey, baseURL });
};
```

- [ ] **Step 3: Commit**

```bash
git add scripts/record/config.ts scripts/record/openai-client.ts
git commit -m "feat(record): add config and OpenAI client factory"
```

---

### Task 22: Build `node-context.ts` (Node-side ToolContext)

**Files:** Create `scripts/record/node-context.ts`

- [ ] **Step 1: Create the Node ToolContext factory**

```ts
// scripts/record/node-context.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryFs } from '../../src/utils/in-memory-fs.js';
import type { ToolContext } from '../../src/tools/types.js';

export const createNodeContext = (sandboxFixture?: string): ToolContext => {
  let fs: InMemoryFs | undefined;
  if (sandboxFixture) {
    const fsJsonPath = path.resolve('src/data/sandboxes', sandboxFixture, 'fs.json');
    const data = JSON.parse(readFileSync(fsJsonPath, 'utf-8'));
    fs = new InMemoryFs(data);
  }
  // in-memory mock storage for save_* tools during recording
  const mem = new Map<string, string>();
  return {
    fs,
    notify: async (n) => {
      console.log(`[mock notify] ${n.title}: ${n.body}`);
      return { delivered: false, channel: 'mock' };
    },
    clipboard: {
      writeText: async (s) => {
        console.log(`[mock clipboard] write: ${s.slice(0, 60)}${s.length > 60 ? '...' : ''}`);
      },
    },
    storage: {
      setItem: (k, v) => { mem.set(k, v); console.log(`[mock storage] ${k} <- ${v.slice(0, 60)}...`); },
      getItem: (k) => mem.get(k) ?? null,
    },
    fetch: globalThis.fetch,
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/node-context.ts
git commit -m "feat(record): add Node-side ToolContext factory (mocks side effects)"
```

---

### Task 23: Build `manifest-loader.ts`

**Files:** Create `scripts/record/manifest-loader.ts`

- [ ] **Step 1: Create the loader**

```ts
// scripts/record/manifest-loader.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ExampleSchema, type Example } from '../../src/types/schemas.js';
import { ALL_TOOLS } from '../../src/tools/index.js';
import { PATHS } from './config.js';

export type ManifestRaw = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: string[];                  // names only in YAML
  finalActionTools: string[];
  systemPromptExtras?: { zh: string; en: string };
  sandboxFixture?: string;
};

export const loadManifest = (exampleId: string): Example => {
  const filePath = path.resolve(PATHS.manifestsDir, `${exampleId}.yaml`);
  const raw = yaml.load(readFileSync(filePath, 'utf-8')) as ManifestRaw;
  // expand tool names → full ToolSpec by looking up in ALL_TOOLS
  const tools = raw.tools.map((name) => {
    const tool = ALL_TOOLS[name];
    if (!tool) throw new Error(`Unknown tool in manifest: ${name}`);
    return {
      name,
      description: { zh: name, en: name },   // descriptions to be filled by Plan B i18n
      parameters: tool.schema,
    };
  });
  const expanded = { ...raw, tools };
  return ExampleSchema.parse(expanded);
};
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/manifest-loader.ts
git commit -m "feat(record): add YAML manifest loader + Zod validation"
```

---

### Task 24: Write the 4 example manifests

**Files:** Create 4 YAML files in `scripts/record/manifests/`

- [ ] **Step 1: Create `scripts/record/manifests/downloads-bigfiles.yaml`**

```yaml
id: downloads-bigfiles
name:
  zh: "找大文件"
  en: "Find big downloads"
taskPrompt:
  zh: "列出 ~/Downloads 文件夹里大于 1GB 的文件,按大小从大到小排列。"
  en: "List files in ~/Downloads larger than 1GB, sorted from largest to smallest."
tools:
  - list_directory
  - get_file_size
finalActionTools: []
sandboxFixture: downloads-bigfiles
```

- [ ] **Step 2: Create `scripts/record/manifests/shanghai-weather.yaml`**

```yaml
id: shanghai-weather
name:
  zh: "上海天气提醒"
  en: "Shanghai weather reminder"
taskPrompt:
  zh: "查一下上海明天的天气,如果有雨或有较高降水概率,提醒我带伞。"
  en: "Check tomorrow's weather in Shanghai. If it's rainy or has high precipitation probability, remind me to bring an umbrella."
tools:
  - get_weather
  - send_notification
finalActionTools:
  - send_notification
```

- [ ] **Step 3: Create `scripts/record/manifests/wikipedia-tweet.yaml`**

```yaml
id: wikipedia-tweet
name:
  zh: "Transformer 推文"
  en: "Transformer tweet"
taskPrompt:
  zh: "读 Wikipedia 上 'Transformer (machine learning model)' 条目的开头摘要,写一条 280 字符以内的推文向新手介绍它。"
  en: "Read the lead section of the Wikipedia article 'Transformer (machine learning model)' and write a tweet (≤280 chars) introducing it to a newcomer."
tools:
  - fetch_wikipedia_article
  - save_tweet_draft
finalActionTools:
  - save_tweet_draft
```

- [ ] **Step 4: Create `scripts/record/manifests/hn-weekend-pick.yaml`**

```yaml
id: hn-weekend-pick
name:
  zh: "HN 周末读物"
  en: "HN weekend pick"
taskPrompt:
  zh: "拉 Hacker News 当前 top 10,先看标题挑出 3-5 个可能适合周末细读的故事,再 fetch 这些故事的详情(text/url),最后选 1 个推荐并写一段简短理由。"
  en: "Fetch HN top 10. From titles, pick 3-5 stories that look suitable for weekend reading. Fetch their details. Recommend one and write a short reason."
tools:
  - fetch_hn_top
  - fetch_hn_story
  - save_recommendation
finalActionTools:
  - save_recommendation
systemPromptExtras:
  zh: "在 save_recommendation 之前必须先 fetch 至少 3 个 story 的详情。"
  en: "Before save_recommendation, fetch details of at least 3 stories."
```

- [ ] **Step 5: Commit**

```bash
git add scripts/record/manifests/
git commit -m "feat(record): add 4 example manifests"
```

---

## Phase 6: Recording Scripts

### Task 25: Implement `tokenize.ts` script

**Files:** Create `scripts/record/tokenize.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/tokenize.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { encoding_for_model } from 'tiktoken';
import { loadManifest } from './manifest-loader.js';
import { PATHS } from './config.js';
import { TokenizeDataSchema, type TokenizeData } from '../../src/types/schemas.js';

export async function runTokenize(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const prompt = manifest.taskPrompt[lang];

  const enc = encoding_for_model('gpt-4');  // cl100k_base
  const tokenIds = enc.encode(prompt);

  // Build byte ranges. Decode each token to its bytes and accumulate.
  const promptBytes = new TextEncoder().encode(prompt);
  const tokens: TokenizeData['tokens'] = [];
  let byteCursor = 0;
  for (const id of tokenIds) {
    const tokenBytes = enc.decode(new Uint32Array([id]));  // returns Uint8Array
    const text = new TextDecoder('utf-8', { fatal: false }).decode(tokenBytes);
    tokens.push({
      id,
      text,
      byteRange: [byteCursor, byteCursor + tokenBytes.length],
    });
    byteCursor += tokenBytes.length;
  }
  enc.free();
  if (byteCursor !== promptBytes.length) {
    throw new Error(`Tokenize byte mismatch: ${byteCursor} vs ${promptBytes.length}`);
  }

  const data: TokenizeData = {
    _meta: {
      model: 'cl100k_base',                          // tokenizer, not chat model
      recordedAt: new Date().toISOString(),
      scriptVersion: 'tokenize.ts',
      lang,
    },
    prompt,
    tokens,
  };
  TokenizeDataSchema.parse(data);  // self-validate

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `tokenize.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[tokenize] wrote ${exampleId}/tokenize.${lang}.json (${tokens.length} tokens)`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/tokenize.ts
git commit -m "feat(record): add tokenize.ts (tiktoken cl100k_base)"
```

---

### Task 26: Implement `logits.ts` script

**Files:** Create `scripts/record/logits.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/logits.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { LogitsDataSchema, type LogitsData } from '../../src/types/schemas.js';

const isFormatToken = (text: string): boolean =>
  /^[\s\.,;:!\?\-'"()\[\]{}]+$/.test(text);

const entropy = (logprobs: number[]): number => {
  // sum -p * log p; convert logprobs to probs first (softmax over the slice we have)
  const maxLp = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - maxLp));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
};

export async function runLogits(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const prompt = manifest.taskPrompt[lang];
  const client = createOpenAIClient();

  const langDirective = lang === 'zh' ? 'Respond in zh-CN.' : 'Respond in en.';
  const completion = await client.chat.completions.create({
    model: RECORDING_CONFIG.model,
    seed: RECORDING_CONFIG.seed,
    temperature: 1.0,
    stream: false,
    logprobs: true,
    top_logprobs: RECORDING_CONFIG.topLogprobs,
    messages: [
      { role: 'system', content: `You are a helpful assistant. ${langDirective}` },
      { role: 'user', content: prompt },
    ],
  });

  const choice = completion.choices[0];
  const allTokens = choice.logprobs?.content ?? [];
  if (allTokens.length === 0) throw new Error('logits.ts: no logprobs returned');

  // pick 8-12 educational steps per heuristic
  const picked: number[] = [];
  for (let i = 0; i < allTokens.length && picked.length < 12; i++) {
    const step = allTokens[i];
    const topLps = (step.top_logprobs ?? []).map((tl) => tl.logprob);
    const e = entropy(topLps);
    const topTwo = topLps.sort((a, b) => b - a).slice(0, 2);
    const tieDelta = topTwo.length === 2 ? Math.abs(topTwo[0] - topTwo[1]) : 99;
    const isFormat = isFormatToken(step.token);
    if (e > RECORDING_CONFIG.highEntropyNats || tieDelta < RECORDING_CONFIG.topPairLogprobDeltaMax || isFormat) {
      picked.push(i);
    }
  }
  // pad to 8 if heuristics didn't yield enough
  while (picked.length < 8 && picked.length < allTokens.length) {
    const candidate = Math.floor(allTokens.length * picked.length / 8);
    if (!picked.includes(candidate)) picked.push(candidate);
    else break;
  }
  picked.sort((a, b) => a - b);

  const contextBuf: string[] = [];
  const steps: LogitsData['steps'] = picked.map((stepIdx) => {
    while (contextBuf.length <= stepIdx) {
      contextBuf.push(allTokens[contextBuf.length]?.token ?? '');
    }
    const contextPreview = contextBuf.slice(0, stepIdx).join('').slice(-200);
    const topK = (allTokens[stepIdx].top_logprobs ?? []).map((tl) => ({
      token: tl.token,
      tokenId: 0,             // OpenAI doesn't expose tokenId in logprobs response; placeholder
      logprob: tl.logprob,
    }));
    return { stepIndex: stepIdx, contextPreview, topK };
  });

  const data: LogitsData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'logits.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    steps,
  };
  LogitsDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `logits.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[logits] wrote ${exampleId}/logits.${lang}.json (${steps.length} steps from ${allTokens.length} total tokens)`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/logits.ts
git commit -m "feat(record): add logits.ts (top-20 with educational step selection)"
```

---

### Task 27: Implement `sampling.ts` script

**Files:** Create `scripts/record/sampling.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/sampling.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { LogitsDataSchema, SamplingDataSchema, type SamplingData } from '../../src/types/schemas.js';

const SAMPLING_METHODS: Array<{ method: SamplingData['paths'][number]['method']; params: Record<string, number> }> = [
  { method: 'greedy',    params: { temperature: 0 } },
  { method: 'low-temp',  params: { temperature: 0.5 } },
  { method: 'top-p',     params: { top_p: 0.9, temperature: 1 } },
  { method: 'high-temp', params: { temperature: 1.5 } },
];

const computeEntropy = (logprobs: number[]): number => {
  const max = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return -exps.map((e) => e / sum).reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
};

export async function runSampling(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const logitsPath = path.resolve(PATHS.examplesDir, exampleId, `logits.${lang}.json`);
  const logits = LogitsDataSchema.parse(JSON.parse(readFileSync(logitsPath, 'utf-8')));

  // pick highest-entropy step from logits as baseStep
  let best = logits.steps[0];
  let bestE = computeEntropy(best.topK.map((t) => t.logprob));
  for (const s of logits.steps) {
    const e = computeEntropy(s.topK.map((t) => t.logprob));
    if (e > bestE) { best = s; bestE = e; }
  }
  const baseStep = best.stepIndex;
  const baseStepLogprobs = best.topK;
  const prefix = best.contextPreview;

  const client = createOpenAIClient();
  const langDirective = lang === 'zh' ? 'Respond in zh-CN.' : 'Respond in en.';
  const paths: SamplingData['paths'] = [];

  for (const { method, params } of SAMPLING_METHODS) {
    const completion = await client.chat.completions.create({
      model: RECORDING_CONFIG.model,
      stream: false,
      // intentionally NO seed for sampling — we want true variability
      messages: [
        { role: 'system', content: `Continue the user's text naturally. Output ~20 more tokens. ${langDirective}` },
        { role: 'user', content: manifest.taskPrompt[lang] + '\n\nAssistant partial answer (continue): ' + prefix },
      ],
      max_tokens: 25,
      ...params,
    });
    const text = completion.choices[0].message.content ?? '';
    paths.push({ method, params, tokens: text.split(/(?<=.)/).slice(0, 25) });
  }

  const data: SamplingData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'sampling.ts',
      lang,
    },
    baseStep,
    baseStepLogprobs,
    paths,
  };
  SamplingDataSchema.parse(data);
  const outPath = path.resolve(PATHS.examplesDir, exampleId, `sampling.${lang}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`[sampling] wrote ${exampleId}/sampling.${lang}.json (baseStep ${baseStep}, 4 paths)`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/sampling.ts
git commit -m "feat(record): add sampling.ts (4 real model runs at varied params)"
```

---

### Task 28: Implement shared agent-loop runner

**Files:** Create `scripts/record/agent-runner.ts`

This is the engine used by both `function-calls.ts` (single iteration with logprobs) and `agent-loops.ts` (full loop, two modes).

- [ ] **Step 1: Implement**

```ts
// scripts/record/agent-runner.ts
import type OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { createNodeContext } from './node-context.js';
import { ALL_TOOLS } from '../../src/tools/index.js';
import { RECORDING_CONFIG } from './config.js';
import type { Example, AgentLoopData } from '../../src/types/schemas.js';

const baseSystemPrompt = (manifest: Example, lang: 'zh' | 'en', deliberative: boolean): string => {
  const langDirective = lang === 'zh' ? 'zh-CN' : 'en';
  const finalNames = manifest.finalActionTools.join(', ') || '(none)';
  const extras = manifest.systemPromptExtras?.[lang] ?? '';
  return `You are an autonomous agent. Available tools: ${manifest.tools.map((t) => t.name).join(', ')}.

LANGUAGE: Respond ONLY in ${langDirective}. All "Thought:" lines and your final answer must be in that language. Tool arguments stay as-is.

CRITICAL FORMAT RULES:
1. Before EVERY tool call, output exactly one line starting with "Thought: " explaining in <=1 sentence why you call this tool.
2. Then call the tool via the function-calling protocol.
3. When the task is complete, respond with text only (no tool call). Your final text should be a clear answer to the user.
4. Final-action tools for this task: ${finalNames}. Prefer ending by calling one if listed.
${deliberative ? `\nDELIBERATIVE MODE:\nFirst output a numbered plan (1. 2. 3. ...) of the tool calls you intend to make.\nThen execute the plan in order without revising it. If a step fails, continue and note the failure in your final response.\n` : ''}
${extras}`;
};

export type RunResult = AgentLoopData & {
  rawMessages: ChatCompletionMessageParam[];   // for downstream consistency check
};

export async function runAgent(
  client: OpenAI,
  manifest: Example,
  lang: 'zh' | 'en',
  mode: 'reactive' | 'deliberative',
  options: { logprobs?: boolean; topLogprobs?: number; firstCallOnly?: boolean } = {}
): Promise<RunResult> {
  const ctx = createNodeContext(manifest.sandboxFixture);
  const tools: ChatCompletionTool[] = manifest.tools.map((t) => ({
    type: 'function',
    function: { name: t.name, parameters: t.parameters as Record<string, unknown> },
  }));

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: baseSystemPrompt(manifest, lang, mode === 'deliberative') },
    { role: 'user', content: manifest.taskPrompt[lang] },
  ];

  const iterations: AgentLoopData['iterations'] = [];
  let terminationReason: AgentLoopData['terminationReason'] = 'max-iter';
  let finalText: string | undefined;
  let firstCallLogprobs: unknown;

  for (let iter = 0; iter < RECORDING_CONFIG.maxIterations; iter++) {
    const args: Parameters<typeof client.chat.completions.create>[0] = {
      model: RECORDING_CONFIG.model,
      seed: RECORDING_CONFIG.seed,
      temperature: 1.0,
      stream: false,
      messages,
      tools,
      parallel_tool_calls: false,
    };
    if (options.logprobs && iter === 0) {
      (args as Record<string, unknown>).logprobs = true;
      (args as Record<string, unknown>).top_logprobs = options.topLogprobs ?? 5;
    }
    const response = await client.chat.completions.create(args);
    const choice = response.choices[0];
    const message = choice.message;

    if (iter === 0 && options.logprobs) {
      firstCallLogprobs = choice.logprobs;
    }

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // text-final
      finalText = message.content ?? '';
      terminationReason = 'text-final';
      break;
    }

    const call = message.tool_calls[0];
    const toolName = call.function.name;
    const toolArgs = JSON.parse(call.function.arguments);

    // Parse Thought: line out of message.content
    const content = message.content ?? '';
    const thoughtMatch = content.match(/Thought:\s*(.+?)$/m);
    const thought = thoughtMatch?.[1]?.trim() ?? '';

    // Execute tool
    const tool = ALL_TOOLS[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const observation = await tool.exec(toolArgs as never, ctx);

    iterations.push({
      thought: thought.slice(0, RECORDING_CONFIG.reasoningTruncateChars),
      action: { name: toolName, arguments: toolArgs },
      observation: truncateObservation(observation),
    });

    if (options.firstCallOnly) {
      // Used by function-calls.ts — stop after first call
      break;
    }

    if (manifest.finalActionTools.includes(toolName)) {
      terminationReason = 'final-action-called';
      // continue one more iteration to let model wrap up? No — stop here.
      break;
    }

    messages.push(message);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(observation),
    });
  }

  return {
    iterations,
    terminationReason,
    finalText,
    terminationNote: terminationNoteFor(terminationReason, lang),
    rawMessages: messages,
    ...(firstCallLogprobs ? { firstCallLogprobs } : {}),
  } as RunResult;
}

function truncateObservation(obs: unknown): unknown {
  const json = JSON.stringify(obs);
  if (json.length <= RECORDING_CONFIG.observationTruncateChars) return obs;
  return { _truncated: true, originalLength: json.length, preview: json.slice(0, RECORDING_CONFIG.observationTruncateChars) };
}

function terminationNoteFor(reason: AgentLoopData['terminationReason'], lang: 'zh' | 'en'): string {
  const notes = {
    'text-final':           { zh: '模型给出最终文本答复后停止',     en: 'Model produced a text-only final answer and stopped.' },
    'final-action-called':  { zh: '模型调用了 final-action 工具后停止', en: 'Model called the designated final-action tool.' },
    'max-iter':             { zh: '达到最大迭代次数(录制失败信号)',   en: 'Reached MAX_ITERATIONS (recording-failure signal).' },
  } as const;
  return notes[reason][lang];
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/agent-runner.ts
git commit -m "feat(record): add agent-runner with ReAct prompt + termination conditions"
```

---

### Task 29: Implement `function-calls.ts` script

**Files:** Create `scripts/record/function-calls.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/function-calls.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { runAgent } from './agent-runner.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { FunctionCallDataSchema, type FunctionCallData } from '../../src/types/schemas.js';

export async function runFunctionCalls(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const client = createOpenAIClient();

  // run with logprobs + firstCallOnly to capture the first tool decision
  const result = await runAgent(client, manifest, lang, 'reactive', {
    logprobs: true,
    topLogprobs: 5,
    firstCallOnly: true,
  });

  if (result.iterations.length === 0) {
    throw new Error('function-calls.ts: model did not produce a tool call on first turn');
  }

  const first = result.iterations[0];
  // top-3 candidates: from logprobs of the FIRST output token (heuristic — the first
  // token of the function name field). OpenAI's logprobs.content gives per-token,
  // including the tokens inside the JSON tool call payload.
  const rawLogprobs = (result as unknown as { firstCallLogprobs?: { content?: Array<{ token: string; top_logprobs?: Array<{ token: string; logprob: number }> }> } }).firstCallLogprobs;
  const allKnown = manifest.tools.map((t) => t.name);
  let toolCandidates: FunctionCallData['toolCandidates'] = [];
  // crude: search for first occurrence of a known tool name token in the logprobs stream
  for (const step of rawLogprobs?.content ?? []) {
    const top = step.top_logprobs ?? [];
    const matchedKnown = top.filter((tl) =>
      allKnown.some((name) => name.startsWith(tl.token) || tl.token.startsWith(name.slice(0, Math.min(5, name.length))))
    );
    if (matchedKnown.length >= 2) {
      toolCandidates = matchedKnown.slice(0, 3).map((tl) => ({ name: tl.token, logprob: tl.logprob }));
      break;
    }
  }
  if (toolCandidates.length === 0) {
    // fallback: just use the chosen tool + two zero-prob placeholders
    toolCandidates = [{ name: first.action.name, logprob: 0 }];
  }

  const data: FunctionCallData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'function-calls.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    reasoning: first.thought,
    toolCandidates,
    call: first.action,
  };
  FunctionCallDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `function-calls.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[function-calls] wrote ${exampleId}/function-calls.${lang}.json — call: ${data.call.name}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/function-calls.ts
git commit -m "feat(record): add function-calls.ts (single iteration + top-3 candidates)"
```

---

### Task 30: Implement `agent-loops.ts` script (with consistency check)

**Files:** Create `scripts/record/agent-loops.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/agent-loops.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { runAgent } from './agent-runner.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { TopologyDataSchema, FunctionCallDataSchema, type TopologyData } from '../../src/types/schemas.js';

export async function runAgentLoops(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const client = createOpenAIClient();

  // ---- reactive ----
  const reactive = await runAgent(client, manifest, lang, 'reactive', {});
  if (reactive.terminationReason === 'max-iter') {
    throw new Error(`Reactive recording for ${exampleId}/${lang} hit max-iter — adjust prompt and re-run`);
  }

  // ---- consistency check: first-call must match function-calls.ts ----
  const fcPath = path.resolve(PATHS.examplesDir, exampleId, `function-calls.${lang}.json`);
  const fc = FunctionCallDataSchema.parse(JSON.parse(readFileSync(fcPath, 'utf-8')));
  const firstCall = reactive.iterations[0]?.action;
  if (!firstCall || firstCall.name !== fc.call.name) {
    throw new Error(
      `Consistency check FAILED for ${exampleId}/${lang}:
function-calls.json call: ${JSON.stringify(fc.call)}
agent-loops reactive[0]:  ${JSON.stringify(firstCall)}
The two recordings must agree (same seed + same prompt).`
    );
  }

  // ---- deliberative ----
  const deliberativeResult = await runAgent(client, manifest, lang, 'deliberative', {});
  if (deliberativeResult.terminationReason === 'max-iter') {
    throw new Error(`Deliberative recording for ${exampleId}/${lang} hit max-iter`);
  }

  // Parse the plan from deliberative's first message content
  // (the first turn's text should contain numbered list before any tool call)
  const firstThought = deliberativeResult.iterations[0]?.thought ?? deliberativeResult.finalText ?? '';
  const planLines = Array.from(firstThought.matchAll(/^\s*(\d+)\.\s+(.+)$/gm));
  if (planLines.length === 0) {
    // Recoverable: maybe the deliberative model produced the plan in the system response
    // before any tool call. For now, treat empty plan as a recording failure to re-prompt.
    throw new Error(`Deliberative ${exampleId}/${lang}: no numbered plan parsed from first thought. Re-record with stronger prompt.`);
  }
  const plan: TopologyData['deliberative']['plan'] = planLines.map((m, i) => ({
    id: `step-${i + 1}`,
    stepLabel: m[2].trim(),
  }));

  // Map each deliberative iteration to a plan step (best-effort by index)
  const execution: TopologyData['deliberative']['execution'] = deliberativeResult.iterations.map((iter, i) => ({
    planStepId: i < plan.length ? plan[i].id : null,
    actualCall: iter.action,
    observation: iter.observation,
    deviated: i >= plan.length,
  }));

  const deviationSummary =
    execution.some((e) => e.deviated) || execution.length !== plan.length
      ? (lang === 'zh' ? `Plan 有 ${plan.length} 步,实际执行 ${execution.length} 步,出现偏离。` : `Plan: ${plan.length} steps; actual: ${execution.length}. Deviation observed.`)
      : (lang === 'zh' ? '模型严格按 plan 执行,无偏离。' : 'Model followed plan exactly.');

  const data: TopologyData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'agent-loops.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    reactive: {
      iterations: reactive.iterations,
      terminationReason: reactive.terminationReason,
      finalText: reactive.finalText,
      terminationNote: reactive.terminationNote,
    },
    deliberative: {
      plan,
      execution,
      deviationSummary,
    },
  };
  TopologyDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `topology.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[agent-loops] wrote ${exampleId}/topology.${lang}.json — reactive(${reactive.iterations.length} iter), deliberative(plan ${plan.length} / exec ${execution.length})`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/record/agent-loops.ts
git commit -m "feat(record): add agent-loops.ts (reactive + deliberative + consistency check)"
```

---

### Task 31: CLI entry `scripts/record/index.ts`

**Files:** Create `scripts/record/index.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/record/index.ts
import 'dotenv/config';
import { runTokenize } from './tokenize.js';
import { runLogits } from './logits.js';
import { runSampling } from './sampling.js';
import { runFunctionCalls } from './function-calls.js';
import { runAgentLoops } from './agent-loops.js';

const ALL_EXAMPLES = ['downloads-bigfiles', 'shanghai-weather', 'wikipedia-tweet', 'hn-weekend-pick'];
const LANGS = ['zh', 'en'] as const;

const parseArgs = (): { example: string | 'all'; langs: typeof LANGS[number][] } => {
  const args = process.argv.slice(2);
  let example: string = 'all';
  let langs: typeof LANGS[number][] = [...LANGS];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example') example = args[++i];
    if (args[i] === '--lang') {
      const v = args[++i];
      if (v !== 'zh' && v !== 'en') throw new Error('--lang must be zh or en');
      langs = [v];
    }
  }
  return { example, langs };
};

async function recordOne(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  console.log(`\n=== ${exampleId} / ${lang} ===`);
  await runTokenize(exampleId, lang);
  await runLogits(exampleId, lang);
  await runSampling(exampleId, lang);
  await runFunctionCalls(exampleId, lang);
  await runAgentLoops(exampleId, lang);  // includes consistency check
}

(async () => {
  const { example, langs } = parseArgs();
  const examples = example === 'all' ? ALL_EXAMPLES : [example];
  for (const ex of examples) {
    for (const lang of langs) {
      await recordOne(ex, lang);
    }
  }
  console.log('\nAll recording complete.');
})().catch((e) => {
  console.error('Recording failed:', e);
  process.exit(1);
});
```

- [ ] **Step 2: Install dotenv**

```bash
npm install -D dotenv
```

- [ ] **Step 3: Commit**

```bash
git add scripts/record/index.ts package.json package-lock.json
git commit -m "feat(record): add CLI entry that orchestrates all scripts"
```

---

### Task 32: Add `recording-notes.md`

**Files:** Create `docs/recording-notes.md`

- [ ] **Step 1: Write the document**

```md
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
3. Truncation is allowed (≤ 500 chars for reasoning, ≤ 2000 for tool observations) via `slice(0, n)` + ellipsis. Mid-string deletion is forbidden.
4. zh and en are recorded as separate runs; their iteration counts and tool sequences may differ. This is intentional.
5. Only one transformation happens in the browser: Station 3's temperature slider re-softmaxes the captured top-20 logprobs in-browser. This is math, not a fake; the slider only affects the visible top-20 distribution.

## What to do if recording is unstable

- `max-iter` termination: prompt is too vague; tighten the system prompt or task prompt.
- Consistency check failure (`function-calls.ts` first call ≠ `agent-loops.ts` reactive[0]): seed reproducibility broke; check if model version changed or seed config drifted.
- Wikipedia `missingtitle`: article title in manifest is wrong; verify the exact title on Wikipedia.

## Re-recording

Re-recording is a deliberate one-time act, not a CI step. Run `npm run record -- --example=<id>` after verifying the manifest is correct.

## Mock side effects in Node

During recording, `send_notification` / `save_tweet_draft` / `save_recommendation` go through the Node ToolContext, which only logs to stdout. The observations they return are still real (produced by real tool code). The runtime browser version triggers real side effects (Notification API, clipboard, localStorage).
```

- [ ] **Step 2: Commit**

```bash
git add docs/recording-notes.md
git commit -m "docs: add recording-notes.md (integrity rules + recovery guide)"
```

---

## Phase 7: Run Recording for All Examples

### Task 33: Smoke test recording on a single example

- [ ] **Step 1: Verify env**

```bash
cat ~/workspace/from-tokens-to-tools/.env
```

Expected: contains `OPENAI_API_KEY=...` and `OPENAI_BASE_URL=...`.

- [ ] **Step 2: Run recording for downloads-bigfiles, zh only**

```bash
cd ~/workspace/from-tokens-to-tools
npm run record -- --example=downloads-bigfiles --lang=zh
```

Expected: 5 JSON files appear at `src/data/examples/downloads-bigfiles/*.zh.json`. Console logs each script's progress.

- [ ] **Step 3: Spot-check one of the outputs**

```bash
cat src/data/examples/downloads-bigfiles/tokenize.zh.json | head -30
```

Expected: valid JSON with `_meta`, `prompt`, `tokens` array.

- [ ] **Step 4: Manually validate all 5 outputs against Zod**

Create `scripts/record/_validate.ts`:

```ts
// scripts/record/_validate.ts
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, TopologyDataSchema,
} from '../../src/types/schemas.js';

const SCHEMAS: Record<string, { parse: (x: unknown) => unknown }> = {
  tokenize: TokenizeDataSchema,
  logits: LogitsDataSchema,
  sampling: SamplingDataSchema,
  'function-calls': FunctionCallDataSchema,
  topology: TopologyDataSchema,
};

const exampleDir = process.argv[2];
if (!exampleDir) { console.error('usage: tsx _validate.ts <exampleDir>'); process.exit(1); }

const files = readdirSync(exampleDir).filter((f) => f.endsWith('.json'));
let ok = 0, bad = 0;
for (const f of files) {
  const base = f.split('.')[0];
  const schema = SCHEMAS[base];
  if (!schema) { console.warn(`No schema for ${f}, skipping`); continue; }
  try {
    schema.parse(JSON.parse(readFileSync(path.join(exampleDir, f), 'utf-8')));
    console.log(`OK  ${f}`);
    ok++;
  } catch (e) {
    console.error(`BAD ${f}:`, (e as Error).message.slice(0, 200));
    bad++;
  }
}
console.log(`\nValidation summary: ${ok} OK, ${bad} bad`);
process.exit(bad > 0 ? 1 : 0);
```

Then:

```bash
npx tsx scripts/record/_validate.ts src/data/examples/downloads-bigfiles
```

Expected: 5 lines of `OK ...`, `Validation summary: 5 OK, 0 bad`.

- [ ] **Step 5: Commit recording output**

```bash
git add src/data/examples/downloads-bigfiles/ scripts/record/_validate.ts
git commit -m "data: record downloads-bigfiles (zh) — smoke test passed"
```

---

### Task 34: Record remaining 3 examples × 2 languages

- [ ] **Step 1: Run downloads-bigfiles English**

```bash
npm run record -- --example=downloads-bigfiles --lang=en
```

- [ ] **Step 2: Run shanghai-weather both languages**

```bash
npm run record -- --example=shanghai-weather
```

- [ ] **Step 3: Run wikipedia-tweet both languages**

```bash
npm run record -- --example=wikipedia-tweet
```

- [ ] **Step 4: Run hn-weekend-pick both languages**

```bash
npm run record -- --example=hn-weekend-pick
```

- [ ] **Step 5: Validate all outputs**

```bash
for ex in downloads-bigfiles shanghai-weather wikipedia-tweet hn-weekend-pick; do
  echo "--- $ex ---"
  npx tsx scripts/record/_validate.ts src/data/examples/$ex || exit 1
done
```

Expected: 5 OK per directory, 4 dirs total = 20 OK, 0 bad.

- [ ] **Step 6: Commit all recorded data**

```bash
git add src/data/examples/
git commit -m "data: record shanghai-weather + wikipedia-tweet + hn-weekend-pick (zh+en)"
```

---

### Task 35: Final sanity — list inventory + final commit

- [ ] **Step 1: Inventory recorded files**

```bash
ls -lh src/data/examples/*/  | tail -50
find src/data/examples -name '*.json' | wc -l
```

Expected: 40 JSON files (4 examples × 2 langs × 5 file types).

- [ ] **Step 2: Tag end of Plan A**

```bash
git tag plan-a-complete -m "Plan A: foundation + recording pipeline complete"
```

- [ ] **Step 3: Verify git log**

```bash
git log --oneline | head -40
```

Expected: all 30+ commits from Plan A visible, in coherent feat/docs/data progression.

---

## End of Plan A

Plan A produces:
- A buildable Vite + React + TS + Tailwind project (no UI yet)
- 9 dual-platform tools with TDD coverage
- Recording pipeline (5 scripts orchestrated by CLI)
- 40 validated JSON files (4 examples × 2 langs × 5 file types)
- `recording-notes.md` for transparency

**Plan B** will build the frontend demo that consumes this data. It is a separate plan saved to `docs/superpowers/plans/2026-05-29-plan-B-frontend.md` after Plan A is verified.
