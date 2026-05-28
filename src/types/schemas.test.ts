import { describe, it, expect } from 'vitest';
import {
  RecordingMetaSchema, ToolSpecSchema, ExampleSchema,
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, AgentLoopDataSchema, TopologyDataSchema,
} from './schemas';

// Reference unused-but-spec-required schemas so strict TS doesn't flag the imports.
void LogitsDataSchema;
void FunctionCallDataSchema;

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
