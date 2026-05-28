// src/tools/fetch_hn_top.ts
import type { Tool } from './types';

type Args = Record<string, never>;
type Story = { id: number; type: string; title: string; score: number; url?: string };
type Result = { stories: Story[] } | { error: 'fetch-failed' };

const TIMEOUT_MS = 5000;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

export const fetchHnTopTool: Tool<Args, Result> = {
  name: 'fetch_hn_top',
  schema: { type: 'object', properties: {} },
  async exec(_args, ctx) {
    try {
      const topRes = await withTimeout(ctx.fetch('https://hacker-news.firebaseio.com/v0/topstories.json'), TIMEOUT_MS);
      if (!topRes.ok) return { error: 'fetch-failed' };
      const ids: number[] = (await topRes.json()).slice(0, 10);
      const items = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await withTimeout(ctx.fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`), TIMEOUT_MS);
            if (!r.ok) return null;
            const item = await r.json();
            if (item?.deleted || item?.dead || !item?.id) return null;
            return {
              id: item.id, type: item.type, title: item.title,
              score: item.score ?? 0, url: item.url,
            } as Story;
          } catch {
            return null;
          }
        })
      );
      return { stories: items.filter((x): x is Story => x !== null) };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
