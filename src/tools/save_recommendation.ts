// src/tools/save_recommendation.ts
import type { Tool } from './types';

type Args = { story_id: number; title: string; reason: string };
type Result = { saved: true; key: 'last-rec' };

export const saveRecommendationTool: Tool<Args, Result> = {
  name: 'save_recommendation',
  schema: {
    type: 'object',
    properties: {
      story_id: { type: 'number' },
      title: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['story_id', 'title', 'reason'],
  },
  async exec(args, ctx) {
    ctx.storage.setItem('last-rec', JSON.stringify({ ...args, savedAt: new Date().toISOString() }));
    return { saved: true, key: 'last-rec' };
  },
};
