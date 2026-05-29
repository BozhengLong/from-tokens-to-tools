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
