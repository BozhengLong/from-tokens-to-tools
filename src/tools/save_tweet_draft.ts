// src/tools/save_tweet_draft.ts
import type { Tool } from './types';

type Args = { text: string };
type Result =
  | { cardRendered: true; text: string; length: number }
  | { error: 'too-long'; length: number };

export const saveTweetDraftTool: Tool<Args, Result> = {
  name: 'save_tweet_draft',
  schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Tweet body, max 280 chars' },
    },
    required: ['text'],
  },
  async exec(args) {
    const length = [...args.text].length;
    if (length > 280) return { error: 'too-long', length };
    return { cardRendered: true, text: args.text, length };
  },
};
