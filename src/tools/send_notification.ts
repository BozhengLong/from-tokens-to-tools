// src/tools/send_notification.ts
import type { Tool, NotifyResult } from './types';

type Args = { title: string; body: string };

export const sendNotificationTool: Tool<Args, NotifyResult> = {
  name: 'send_notification',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['title', 'body'],
  },
  async exec(args, ctx) {
    return ctx.notify(args);
  },
};
