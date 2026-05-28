// src/tools/fetch_hn_top.test.ts
import { describe, it, expect } from 'vitest';
import { fetchHnTopTool } from './fetch_hn_top';
import type { ToolContext } from './types';

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
