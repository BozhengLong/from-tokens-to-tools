// src/tools/get_file_size.test.ts
import { describe, it, expect } from 'vitest';
import { getFileSizeTool } from './get_file_size';
import { InMemoryFs } from '@/utils/in-memory-fs';
import type { ToolContext } from './types';

const mockCtx = (fs?: InMemoryFs): ToolContext => ({
  fs,
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('get_file_size', () => {
  it('returns size for an existing file', async () => {
    const fs = new InMemoryFs({ '/x/big.bin': { size: 1_000_000_000, mtime: '2025-01-01T00:00:00Z' } });
    const out = await getFileSizeTool.exec({ path: '/x/big.bin' }, mockCtx(fs));
    expect((out as any).size).toBe(1_000_000_000);
  });

  it('returns error for non-existent file', async () => {
    const fs = new InMemoryFs({});
    const out = await getFileSizeTool.exec({ path: '/nope' }, mockCtx(fs));
    expect((out as any).error).toBe('not-found');
  });
});
