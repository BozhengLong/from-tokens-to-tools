import type { ToolContext, NotifyResult } from '@/tools/types';
import { InMemoryFs } from '@/utils/in-memory-fs';

// Optional sandbox loading: callers that need fs (downloads example) pass the
// already-loaded fixture record. Most UI usage doesn't execute fs tools live.
export function createBrowserContext(fsFixture?: Record<string, { size: number; mtime: string }>): ToolContext {
  return {
    fs: fsFixture ? new InMemoryFs(fsFixture) : undefined,
    notify: async ({ title, body }): Promise<NotifyResult> => {
      if (typeof Notification === 'undefined') {
        return { delivered: false, channel: 'toast' };
      }
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
        return { delivered: true, channel: 'system' };
      }
      // 'denied' or 'default' -> caller shows an in-page toast; we don't request
      // permission here because that needs a user gesture (see design §8).
      return { delivered: false, channel: 'toast' };
    },
    clipboard: {
      writeText: async (s: string) => {
        try {
          if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(s);
        } catch {
          // clipboard requires a user gesture / permission; swallow — the UI
          // offers a manual copy fallback.
        }
      },
    },
    storage: {
      setItem: (k, v) => localStorage.setItem(k, v),
      getItem: (k) => localStorage.getItem(k),
    },
    fetch: globalThis.fetch.bind(globalThis),
  };
}
