// scripts/record/node-context.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryFs } from '../../src/utils/in-memory-fs.js';
import type { ToolContext } from '../../src/tools/types.js';

export const createNodeContext = (sandboxFixture?: string): ToolContext => {
  let fs: InMemoryFs | undefined;
  if (sandboxFixture) {
    const fsJsonPath = path.resolve('src/data/sandboxes', sandboxFixture, 'fs.json');
    const data = JSON.parse(readFileSync(fsJsonPath, 'utf-8'));
    fs = new InMemoryFs(data);
  }
  // in-memory mock storage for save_* tools during recording
  const mem = new Map<string, string>();
  return {
    fs,
    notify: async (n) => {
      console.log(`[mock notify] ${n.title}: ${n.body}`);
      return { delivered: false, channel: 'mock' };
    },
    clipboard: {
      writeText: async (s) => {
        console.log(`[mock clipboard] write: ${s.slice(0, 60)}${s.length > 60 ? '...' : ''}`);
      },
    },
    storage: {
      setItem: (k, v) => { mem.set(k, v); console.log(`[mock storage] ${k} <- ${v.slice(0, 60)}...`); },
      getItem: (k) => mem.get(k) ?? null,
    },
    fetch: globalThis.fetch,
  };
};
