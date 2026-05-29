// scripts/record/agent-loops.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpenAIClient } from './openai-client.js';
import { loadManifest } from './manifest-loader.js';
import { runAgent } from './agent-runner.js';
import { RECORDING_CONFIG, PATHS } from './config.js';
import { TopologyDataSchema, FunctionCallDataSchema, type TopologyData } from '../../src/types/schemas.js';

export async function runAgentLoops(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const client = createOpenAIClient();

  const reactive = await runAgent(client, manifest, lang, 'reactive', {});
  if (reactive.terminationReason === 'max-iter') {
    throw new Error(`Reactive recording for ${exampleId}/${lang} hit max-iter — adjust prompt and re-run`);
  }

  const fcPath = path.resolve(PATHS.examplesDir, exampleId, `function-calls.${lang}.json`);
  const fc = FunctionCallDataSchema.parse(JSON.parse(readFileSync(fcPath, 'utf-8')));
  const firstCall = reactive.iterations[0]?.action;
  if (!firstCall || firstCall.name !== fc.call.name) {
    throw new Error(
      `Consistency check FAILED for ${exampleId}/${lang}:
function-calls.json call: ${JSON.stringify(fc.call)}
agent-loops reactive[0]:  ${JSON.stringify(firstCall)}
The two recordings must agree (same seed + same prompt).`
    );
  }

  const deliberativeResult = await runAgent(client, manifest, lang, 'deliberative', {});
  if (deliberativeResult.terminationReason === 'max-iter') {
    throw new Error(`Deliberative recording for ${exampleId}/${lang} hit max-iter`);
  }

  // The numbered plan lives in the first assistant turn's full content (the model
  // emits it before/alongside its first tool call, often without a "Thought:"
  // prefix). Fall back to the first iteration's thought, then finalText.
  const planSource =
    deliberativeResult.firstTurnContent ||
    deliberativeResult.iterations[0]?.thought ||
    deliberativeResult.finalText ||
    '';
  const planLines = Array.from(planSource.matchAll(/^\s*(\d+)[.、)]\s*(.+)$/gm));
  if (planLines.length === 0) {
    throw new Error(
      `Deliberative ${exampleId}/${lang}: no numbered plan parsed. Re-record with stronger prompt.\n` +
        `--- first-turn content was ---\n${planSource.slice(0, 500)}`
    );
  }
  const plan: TopologyData['deliberative']['plan'] = planLines.map((m, i) => ({
    id: `step-${i + 1}`,
    stepLabel: (m[2] ?? '').trim(),
  }));

  const execution: TopologyData['deliberative']['execution'] = deliberativeResult.iterations.map((iter, i) => {
    const step = plan[i];
    return {
      planStepId: step ? step.id : null,
      actualCall: iter.action,
      observation: iter.observation,
      deviated: i >= plan.length,
    };
  });

  const deviationSummary =
    execution.some((e) => e.deviated) || execution.length !== plan.length
      ? (lang === 'zh' ? `Plan 有 ${plan.length} 步,实际执行 ${execution.length} 步,出现偏离。` : `Plan: ${plan.length} steps; actual: ${execution.length}. Deviation observed.`)
      : (lang === 'zh' ? '模型严格按 plan 执行,无偏离。' : 'Model followed plan exactly.');

  const data: TopologyData = {
    _meta: {
      model: RECORDING_CONFIG.model,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'agent-loops.ts',
      seed: RECORDING_CONFIG.seed,
      lang,
    },
    reactive: {
      iterations: reactive.iterations,
      terminationReason: reactive.terminationReason,
      finalText: reactive.finalText,
      terminationNote: reactive.terminationNote,
    },
    deliberative: {
      plan,
      execution,
      deviationSummary,
    },
  };
  TopologyDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `topology.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[agent-loops] wrote ${exampleId}/topology.${lang}.json — reactive(${reactive.iterations.length} iter), deliberative(plan ${plan.length} / exec ${execution.length})`);
}
