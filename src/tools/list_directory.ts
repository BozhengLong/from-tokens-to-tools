// src/tools/list_directory.ts
import type { Tool } from './types';

type Args = { path: string };
type Result = { entries: Array<{ name: string; size: number; mtime: string }> };

export const listDirectoryTool: Tool<Args, Result> = {
  name: 'list_directory',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute path to the directory' },
    },
    required: ['path'],
  },
  async exec(args, ctx) {
    if (!ctx.fs) throw new Error('list_directory requires ToolContext.fs');
    return { entries: ctx.fs.list(args.path) };
  },
};
