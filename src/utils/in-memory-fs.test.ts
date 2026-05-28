import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFs } from './in-memory-fs';

describe('InMemoryFs', () => {
  let fs: InMemoryFs;

  beforeEach(() => {
    fs = new InMemoryFs({
      '/Downloads/movie.mp4': { size: 2_400_000_000, mtime: '2025-03-15T10:00:00Z' },
      '/Downloads/report.pdf': { size: 1_200_000, mtime: '2025-04-01T09:00:00Z' },
      '/Downloads/installer.dmg': { size: 1_800_000_000, mtime: '2025-05-01T15:00:00Z' },
      '/Documents/notes.txt': { size: 4_000, mtime: '2025-05-29T08:00:00Z' },
    });
  });

  it('lists entries under a path', () => {
    const result = fs.list('/Downloads');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.name).sort()).toEqual(['installer.dmg', 'movie.mp4', 'report.pdf']);
  });

  it('returns empty list for unknown path', () => {
    expect(fs.list('/nonexistent')).toEqual([]);
  });

  it('stat returns size + mtime for known file', () => {
    const s = fs.stat('/Downloads/movie.mp4');
    expect(s).toEqual({ size: 2_400_000_000, mtime: '2025-03-15T10:00:00Z' });
  });

  it('stat throws for unknown file', () => {
    expect(() => fs.stat('/Downloads/nope.zip')).toThrow();
  });
});
