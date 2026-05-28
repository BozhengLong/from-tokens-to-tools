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
