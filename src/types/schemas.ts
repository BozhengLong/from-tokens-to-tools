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

// ========== recording layer (single-language per file) ==========

const TokenSchema = z.object({
  id: z.number(),
  text: z.string(),
  byteRange: z.tuple([z.number(), z.number()]),
});

export const TokenizeDataSchema = z.object({
  _meta: RecordingMetaSchema,
  prompt: z.string(),
  tokens: z.array(TokenSchema),
});
export type TokenizeData = z.infer<typeof TokenizeDataSchema>;

const TopKSchema = z.object({
  token: z.string(),
  tokenId: z.number(),
  logprob: z.number(),
});

export const LogitsDataSchema = z.object({
  _meta: RecordingMetaSchema,
  steps: z.array(z.object({
    stepIndex: z.number(),
    contextPreview: z.string(),
    topK: z.array(TopKSchema),
  })),
});
export type LogitsData = z.infer<typeof LogitsDataSchema>;

export const SamplingDataSchema = z.object({
  _meta: RecordingMetaSchema,
  baseStep: z.number(),
  baseStepLogprobs: z.array(TopKSchema),
  paths: z.array(z.object({
    method: z.enum(['greedy', 'low-temp', 'top-p', 'high-temp']),
    params: z.record(z.string(), z.number()),
    tokens: z.array(z.string()),
  })),
});
export type SamplingData = z.infer<typeof SamplingDataSchema>;

const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const FunctionCallDataSchema = z.object({
  _meta: RecordingMetaSchema,
  reasoning: z.string(),
  toolCandidates: z.array(z.object({ name: z.string(), logprob: z.number() })),
  call: ToolCallSchema,
});
export type FunctionCallData = z.infer<typeof FunctionCallDataSchema>;

export const AgentLoopDataSchema = z.object({
  iterations: z.array(z.object({
    thought: z.string(),
    action: ToolCallSchema,
    observation: z.unknown(),
  })),
  terminationReason: z.enum(['text-final', 'final-action-called', 'max-iter']),
  finalText: z.string().optional(),
  terminationNote: z.string(),
});
export type AgentLoopData = z.infer<typeof AgentLoopDataSchema>;

export const TopologyDataSchema = z.object({
  _meta: RecordingMetaSchema,
  reactive: AgentLoopDataSchema,
  deliberative: z.object({
    plan: z.array(z.object({
      id: z.string(),
      stepLabel: z.string(),
      expectedToolCall: ToolCallSchema.optional(),
    })),
    execution: z.array(z.object({
      planStepId: z.string().nullable(),
      actualCall: ToolCallSchema,
      observation: z.unknown(),
      deviated: z.boolean(),
    })),
    deviationSummary: z.string(),
  }),
});
export type TopologyData = z.infer<typeof TopologyDataSchema>;
