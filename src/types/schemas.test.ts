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
