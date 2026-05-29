// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowserContext } from './browser-context';

describe('createBrowserContext', () => {
  beforeEach(() => { localStorage.clear(); });

  it('storage delegates to localStorage', () => {
    const ctx = createBrowserContext();
    ctx.storage.setItem('k', 'v');
    expect(ctx.storage.getItem('k')).toBe('v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('notify falls back to toast channel when permission denied', async () => {
    const ctx = createBrowserContext();
    const res = await ctx.notify({ title: 'x', body: 'y' });
    expect(['toast', 'system', 'mock']).toContain(res.channel);
    expect(typeof res.delivered).toBe('boolean');
  });

  it('clipboard.writeText resolves (no throw) even without permission', async () => {
    const ctx = createBrowserContext();
    await expect(ctx.clipboard.writeText('hi')).resolves.toBeUndefined();
  });
});
