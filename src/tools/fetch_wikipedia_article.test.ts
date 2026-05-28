// src/tools/fetch_wikipedia_article.test.ts
import { describe, it, expect } from 'vitest';
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
