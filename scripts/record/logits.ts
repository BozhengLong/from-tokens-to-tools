// scripts/record/logits.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { LogitsDataSchema, type LogitsData } from '../../src/types/schemas.js';

const isFormatToken = (text: string): boolean =>
  /^[\s.,;:!?\-'"()[\]{}]+$/.test(text);

const entropy = (logprobs: number[]): number => {
  const maxLp = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - maxLp));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
};

export async function runLogits(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const prompt = manifest.taskPrompt[lang];
  const client = createOpenAIClient();

  const langDirective = lang === 'zh' ? 'Respond in zh-CN.' : 'Respond in en.';
  const completion = await client.chat.completions.create({
    model: RECORDING_CONFIG.model,
    seed: RECORDING_CONFIG.seed,
    temperature: 1.0,
    stream: false,
    logprobs: true,
    top_logprobs: RECORDING_CONFIG.topLogprobs,
    messages: [
      { role: 'system', content: `You are a helpful assistant. ${langDirective}` },
      { role: 'user', content: prompt },
    ],
  });

  const choice = completion.choices[0];
  const allTokens = choice?.logprobs?.content ?? [];
  if (allTokens.length === 0) throw new Error('logits.ts: no logprobs returned');

  const picked: number[] = [];
  for (let i = 0; i < allTokens.length && picked.length < 12; i++) {
    const step = allTokens[i];
    if (!step) continue;
    const topLps = (step.top_logprobs ?? []).map((tl) => tl.logprob);
    const e = entropy(topLps);
    const topTwo = [...topLps].sort((a, b) => b - a).slice(0, 2);
    const tieDelta =
      topTwo.length === 2 ? Math.abs(topTwo[0]! - topTwo[1]!) : 99;
    const isFormat = isFormatToken(step.token);
    if (
      e > RECORDING_CONFIG.highEntropyNats ||
      tieDelta < RECORDING_CONFIG.topPairLogprobDeltaMax ||
      isFormat
    ) {
      picked.push(i);
    }
  }
  while (picked.length < 8 && picked.length < allTokens.length) {
    const candidate = Math.floor((allTokens.length * picked.length) / 8);
    if (!picked.includes(candidate)) picked.push(candidate);
    else break;
  }
  picked.sort((a, b) => a - b);

  const contextBuf: string[] = [];
  const steps: LogitsData['steps'] = picked.map((stepIdx) => {
    while (contextBuf.length <= stepIdx) {
      contextBuf.push(allTokens[contextBuf.length]?.token ?? '');
    }
    const contextPreview = contextBuf.slice(0, stepIdx).join('').slice(-200);
    const topK = (allTokens[stepIdx]?.top_logprobs ?? []).map((tl) => ({
      token: tl.token,
      tokenId: 0,
      logprob: tl.logprob,
    }));
    return { stepIndex: stepIdx, contextPreview, topK };
  });

  const data: LogitsData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'logits.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    steps,
  };
  LogitsDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `logits.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(
    `[logits] wrote ${exampleId}/logits.${lang}.json (${steps.length} steps from ${allTokens.length} total tokens)`,
  );
}
