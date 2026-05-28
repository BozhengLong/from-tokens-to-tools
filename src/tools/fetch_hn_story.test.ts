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
