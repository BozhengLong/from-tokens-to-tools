// scripts/record/function-calls.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { runAgent } from './agent-runner.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { FunctionCallDataSchema, type FunctionCallData } from '../../src/types/schemas.js';

export async function runFunctionCalls(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const client = createOpenAIClient();

  const result = await runAgent(client, manifest, lang, 'reactive', {
    logprobs: true,
    topLogprobs: 5,
    firstCallOnly: true,
  });

  const first = result.iterations[0];
  if (!first) {
    throw new Error('function-calls.ts: model did not produce a tool call on first turn');
  }

  const rawLogprobs = result.firstCallLogprobs as
    | { content?: Array<{ token: string; top_logprobs?: Array<{ token: string; logprob: number }> }> }
    | undefined;
  const allKnown = manifest.tools.map((t) => t.name);
  let toolCandidates: FunctionCallData['toolCandidates'] = [];
  for (const step of rawLogprobs?.content ?? []) {
    const top = step.top_logprobs ?? [];
    const matchedKnown = top.filter((tl) =>
      allKnown.some((name) => name.startsWith(tl.token) || tl.token.startsWith(name.slice(0, Math.min(5, name.length))))
    );
    if (matchedKnown.length >= 2) {
      toolCandidates = matchedKnown.slice(0, 3).map((tl) => ({ name: tl.token, logprob: tl.logprob }));
      break;
    }
  }
  if (toolCandidates.length === 0) {
    toolCandidates = [{ name: first.action.name, logprob: 0 }];
  }

  const data: FunctionCallData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'function-calls.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    reasoning: first.thought,
    toolCandidates,
    call: first.action,
  };
  FunctionCallDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `function-calls.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[function-calls] wrote ${exampleId}/function-calls.${lang}.json — call: ${data.call.name}`);
}
