import { z } from 'zod';
import { BilingualSchema } from './schemas';

// One authored zoom level under a beat (L1..L3). body is the plain-language teaching text.
export const ZoomLevelSchema = z.object({
  level: z.number().int().min(1).max(3),
  title: BilingualSchema,
  body: BilingualSchema,
  // optional "look here" callouts, each pointing at a labeled region of the level
  callouts: z.array(z.object({ label: BilingualSchema, ref: z.string() })).optional(),
});
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

export const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const ZoomContentSchema = z.object({
  levels: z.array(ZoomLevelSchema).min(1),
  // for "model-speaks" beats: the real context to seed the live microscope with
  seedContext: z.string().optional(),
  // pointer into the recorded token-fallback file (e.g. "token-fallback.json#b1")
  tokenFallbackRef: z.string().optional(),
});
export type ZoomContent = z.infer<typeof ZoomContentSchema>;

export const BeatSchema = z.object({
  id: z.string(),
  kind: z.enum(['user', 'model-speaks', 'runtime-acts', 'final']),
  title: BilingualSchema,
  summary: BilingualSchema,
  thought: z.string().optional(),         // model reasoning, when captured
  toolCall: ToolCallSchema.optional(),    // present on model-speaks beats that call a tool
  observation: z.string().optional(),     // present on runtime-acts beats (trimmed real output)
  zoom: ZoomContentSchema.optional(),     // the drill-down material
  bridge: BilingualSchema.optional(),     // the curiosity question leading to the next beat
});
export type Beat = z.infer<typeof BeatSchema>;

export const StoryRunSchema = z.object({
  meta: z.object({
    scenario: z.string(),
    source: z.enum(['claude-code', 'codex']),
    capturedAt: z.string(),
  }),
  beats: z.array(BeatSchema).min(1),
  topology: z.object({
    hasDeliberativeVariant: z.boolean(),
    // when true, a sibling story file holds the deliberative run
    deliberativeRef: z.string().optional(),
  }),
});
export type StoryRun = z.infer<typeof StoryRunSchema>;

// Recorded token-fallback file shape (one entry per "model-speaks" beat id).
export const TokenFallbackSchema = z.record(
  z.string(), // beat id
  z.object({
    model: z.string(),
    prompt: z.string(),
    // ordered generated steps; each step's top-k over the next token
    steps: z.array(z.object({
      chosen: z.string(),
      topK: z.array(z.object({ token: z.string(), id: z.number(), logprob: z.number() })),
    })),
  })
);
export type TokenFallback = z.infer<typeof TokenFallbackSchema>;
