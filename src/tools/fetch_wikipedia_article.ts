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
