// src/tools/get_file_size.ts
import type { Tool } from './types';

type Args = { path: string };
type Result = { size: number; mtime: string } | { error: 'not-found' };

export const getFileSizeTool: Tool<Args, Result> = {
  name: 'get_file_size',
  schema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  async exec(args, ctx) {
    if (!ctx.fs) throw new Error('get_file_size requires ToolContext.fs');
    try {
      const { size, mtime } = ctx.fs.stat(args.path);
      return { size, mtime };
    } catch {
      return { error: 'not-found' };
    }
  },
};
