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
