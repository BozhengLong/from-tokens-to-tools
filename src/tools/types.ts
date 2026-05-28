// src/tools/types.ts
import type { InMemoryFs } from '@/utils/in-memory-fs';

export type NotifyResult = {
  delivered: boolean;
  channel: 'system' | 'toast' | 'mock';
};

export type ToolContext = {
  fs?: InMemoryFs;
  notify: (n: { title: string; body: string }) => Promise<NotifyResult>;
  clipboard: { writeText: (s: string) => Promise<void> };
  storage: {
    setItem: (k: string, v: string) => void;
    getItem: (k: string) => string | null;
  };
  fetch: typeof fetch;
};

export type Tool<Args = unknown, Result = unknown> = {
  name: string;
  schema: Record<string, unknown>;  // JSON Schema for OpenAI function calling
  exec(args: Args, ctx: ToolContext): Promise<Result>;
};
