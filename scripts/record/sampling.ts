// scripts/record/sampling.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import {
  LogitsDataSchema,
  SamplingDataSchema,
  type SamplingData,
} from '../../src/types/schemas.js';

const SAMPLING_METHODS: Array<{
  method: SamplingData['paths'][number]['method'];
  params: Record<string, number>;
}> = [
  { method: 'greedy', params: { temperature: 0 } },
  { method: 'low-temp', params: { temperature: 0.5 } },
  { method: 'top-p', params: { top_p: 0.9, temperature: 1 } },
  { method: 'high-temp', params: { temperature: 1.5 } },
];

const computeEntropy = (logprobs: number[]): number => {
  const max = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return -exps
    .map((e) => e / sum)
    .reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
};

export async function runSampling(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const logitsPath = path.resolve(PATHS.examplesDir, exampleId, `logits.${lang}.json`);
  const logits = LogitsDataSchema.parse(JSON.parse(readFileSync(logitsPath, 'utf-8')));

  if (logits.steps.length === 0) {
    throw new Error(`sampling.ts: logits.${lang}.json has no steps`);
  }

  let best = logits.steps[0]!;
  let bestE = computeEntropy(best.topK.map((t) => t.logprob));
  for (const s of logits.steps) {
    const e = computeEntropy(s.topK.map((t) => t.logprob));
    if (e > bestE) {
      best = s;
      bestE = e;
    }
  }
  const baseStep = best.stepIndex;
  const baseStepLogprobs = best.topK;
  const prefix = best.contextPreview;

  const client = createOpenAIClient();
  const langDirective = lang === 'zh' ? 'Respond in zh-CN.' : 'Respond in en.';
  const paths: SamplingData['paths'] = [];

  for (const { method, params } of SAMPLING_METHODS) {
    const completion = await client.chat.completions.create({
      model: RECORDING_CONFIG.model,
      stream: false,
      messages: [
        {
          role: 'system',
          content: `Continue the user's text naturally. Output ~20 more tokens. ${langDirective}`,
        },
        {
          role: 'user',
          content:
            manifest.taskPrompt[lang] +
            '\n\nAssistant partial answer (continue): ' +
            prefix,
        },
      ],
      max_tokens: 25,
      ...params,
    });
    const text = completion.choices[0]?.message.content ?? '';
    // NOTE: per-character split is a crude stand-in for real tokenization;
    // acceptable for the demo visualization.
    paths.push({ method, params, tokens: text.split(/(?<=.)/).slice(0, 25) });
  }

  const data: SamplingData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'sampling.ts',
      lang,
    },
    baseStep,
    baseStepLogprobs,
    paths,
  };
  SamplingDataSchema.parse(data);
  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `sampling.${lang}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`[sampling] wrote ${exampleId}/sampling.${lang}.json (baseStep ${baseStep}, 4 paths)`);
}
