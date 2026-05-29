import { describe, it, expect } from 'vitest';
import { loadStation } from './loadExampleData';

describe('loadStation (real recorded data)', () => {
  it('loads + validates downloads tokenize zh', async () => {
    const data = await loadStation('downloads-bigfiles', 'tokenize', 'zh');
    expect(data.tokens.length).toBeGreaterThan(0);
    expect(data.prompt).toBeTruthy();
  });

  it('loads topology with reactive iterations', async () => {
    const data = await loadStation('hn-weekend-pick', 'topology', 'en');
    expect(data.reactive.iterations.length).toBeGreaterThan(0);
    expect(['text-final', 'final-action-called', 'max-iter']).toContain(data.reactive.terminationReason);
  });

  it('throws on unknown example (rejected import)', async () => {
    await expect(loadStation('does-not-exist', 'tokenize', 'zh')).rejects.toBeTruthy();
  });
});
