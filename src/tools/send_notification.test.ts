// src/tools/send_notification.test.ts
import { describe, it, expect, vi } from 'vitest';
import { sendNotificationTool } from './send_notification';
import type { ToolContext } from './types';

const mockCtx = (notify: ToolContext['notify']): ToolContext => ({
  notify,
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: globalThis.fetch,
});

describe('send_notification', () => {
  it('delegates to ctx.notify and returns its result', async () => {
    const notify = vi.fn(async () => ({ delivered: true, channel: 'system' as const }));
    const out = await sendNotificationTool.exec(
      { title: 'Hi', body: 'Bring umbrella' },
      mockCtx(notify)
    );
    expect(out).toEqual({ delivered: true, channel: 'system' });
    expect(notify).toHaveBeenCalledWith({ title: 'Hi', body: 'Bring umbrella' });
  });
});
