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
