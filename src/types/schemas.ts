import { z } from 'zod';

// ========== shared ==========

export const BilingualSchema = z.object({
  zh: z.string(),
  en: z.string(),
});
export type Bilingual = z.infer<typeof BilingualSchema>;

export const RecordingMetaSchema = z.object({
  model: z.string(),
  recordedAt: z.string(),
  scriptVersion: z.string(),
  seed: z.number().optional(),
  lang: z.enum(['zh', 'en']),
});
export type RecordingMeta = z.infer<typeof RecordingMetaSchema>;

// ========== manifest layer (bilingual) ==========

export const ToolSpecSchema = z.object({
  name: z.string(),
  description: BilingualSchema,
  parameters: z.record(z.string(), z.unknown()), // JSONSchema object
});
export type ToolSpec = z.infer<typeof ToolSpecSchema>;

export const ExampleSchema = z.object({
  id: z.string(),
  name: BilingualSchema,
  taskPrompt: BilingualSchema,
  tools: z.array(ToolSpecSchema),
  finalActionTools: z.array(z.string()), // tool names that signal loop end
  systemPromptExtras: BilingualSchema.optional(),
  sandboxFixture: z.string().optional(),
});
export type Example = z.infer<typeof ExampleSchema>;
