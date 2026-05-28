import { describe, it, expect } from 'vitest';
import { listDirectoryTool } from './list_directory';
import { InMemoryFs } from '@/utils/in-memory-fs';
import type { ToolContext } from './types';

const mockCtx = (fs?: InMemoryFs): ToolContext => ({
  fs,
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('list_directory', () => {
  it('returns entries for the given path', async () => {
    const fs = new InMemoryFs({
      '/Downloads/a.txt': { size: 100, mtime: '2025-01-01T00:00:00Z' },
      '/Downloads/b.txt': { size: 200, mtime: '2025-01-02T00:00:00Z' },
    });
    const out = await listDirectoryTool.exec({ path: '/Downloads' }, mockCtx(fs));
    expect((out as any).entries.map((e: any) => e.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('throws when fs is not provided', async () => {
    await expect(
      listDirectoryTool.exec({ path: '/x' }, mockCtx(undefined))
    ).rejects.toThrow();
  });
});
