// scripts/record/agent-runner.ts
import type OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionAssistantMessageParam,
} from 'openai/resources/chat/completions';
import { createNodeContext } from './node-context.js';
import { ALL_TOOLS } from '../../src/tools/index.js';
import { RECORDING_CONFIG } from './config.js';
import type { Example, AgentLoopData } from '../../src/types/schemas.js';

const baseSystemPrompt = (manifest: Example, lang: 'zh' | 'en', deliberative: boolean): string => {
  const langDirective = lang === 'zh' ? 'zh-CN' : 'en';
  const finalNames = manifest.finalActionTools.join(', ') || '(none)';
  const extras = manifest.systemPromptExtras?.[lang] ?? '';
  return `You are an autonomous agent. Available tools: ${manifest.tools.map((t) => t.name).join(', ')}.

LANGUAGE: Respond ONLY in ${langDirective}. All "Thought:" lines and your final answer must be in that language. Tool arguments stay as-is.

CRITICAL FORMAT RULES:
1. Before EVERY tool call, output exactly one line starting with "Thought: " explaining in <=1 sentence why you call this tool.
2. Then call the tool via the function-calling protocol.
3. When the task is complete, respond with text only (no tool call). Your final text should be a clear answer to the user.
4. Final-action tools for this task: ${finalNames}. Prefer ending by calling one if listed.
${deliberative ? `\nDELIBERATIVE MODE:\nFirst output a numbered plan (1. 2. 3. ...) of the tool calls you intend to make.\nThen execute the plan in order without revising it. If a step fails, continue and note the failure in your final response.\n` : ''}
${extras}`;
};

export type RunResult = AgentLoopData & {
  rawMessages: ChatCompletionMessageParam[];
  firstCallLogprobs?: unknown;
};

export async function runAgent(
  client: OpenAI,
  manifest: Example,
  lang: 'zh' | 'en',
  mode: 'reactive' | 'deliberative',
  options: { logprobs?: boolean; topLogprobs?: number; firstCallOnly?: boolean } = {}
): Promise<RunResult> {
  const ctx = createNodeContext(manifest.sandboxFixture);
  const tools: ChatCompletionTool[] = manifest.tools.map((t) => ({
    type: 'function',
    function: { name: t.name, parameters: t.parameters as Record<string, unknown> },
  }));

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: baseSystemPrompt(manifest, lang, mode === 'deliberative') },
    { role: 'user', content: manifest.taskPrompt[lang] },
  ];

  const iterations: AgentLoopData['iterations'] = [];
  let terminationReason: AgentLoopData['terminationReason'] = 'max-iter';
  let finalText: string | undefined;
  let firstCallLogprobs: unknown;

  for (let iter = 0; iter < RECORDING_CONFIG.maxIterations; iter++) {
    const args: ChatCompletionCreateParamsNonStreaming = {
      model: RECORDING_CONFIG.model,
      seed: RECORDING_CONFIG.seed,
      temperature: 1.0,
      stream: false,
      messages,
      tools,
      parallel_tool_calls: false,
    };
    if (options.logprobs && iter === 0) {
      args.logprobs = true;
      args.top_logprobs = options.topLogprobs ?? 5;
    }
    const response = await client.chat.completions.create(args);
    const choice = response.choices[0];
    if (!choice) throw new Error('agent-runner: empty choices array from completion');
    const message = choice.message;

    if (iter === 0 && options.logprobs) {
      firstCallLogprobs = choice.logprobs;
    }

    if (!message.tool_calls || message.tool_calls.length === 0) {
      finalText = message.content ?? '';
      terminationReason = 'text-final';
      break;
    }

    const call = message.tool_calls[0];
    if (!call || call.type !== 'function') {
      throw new Error('agent-runner: expected a function tool call but got a different tool-call type');
    }
    const toolName = call.function.name;
    const toolArgs = JSON.parse(call.function.arguments) as Record<string, unknown>;

    const content = message.content ?? '';
    const thoughtMatch = content.match(/Thought:\s*(.+?)$/m);
    const thought = thoughtMatch?.[1]?.trim() ?? '';

    const tool = ALL_TOOLS[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const observation = await tool.exec(toolArgs as never, ctx);

    iterations.push({
      thought: thought.slice(0, RECORDING_CONFIG.reasoningTruncateChars),
      action: { name: toolName, arguments: toolArgs },
      observation: truncateObservation(observation),
    });

    if (options.firstCallOnly) {
      break;
    }

    if (manifest.finalActionTools.includes(toolName)) {
      terminationReason = 'final-action-called';
      break;
    }

    messages.push(message as ChatCompletionAssistantMessageParam);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(observation),
    });
  }

  return {
    iterations,
    terminationReason,
    finalText,
    terminationNote: terminationNoteFor(terminationReason, lang),
    rawMessages: messages,
    firstCallLogprobs,
  };
}

function truncateObservation(obs: unknown): unknown {
  const json = JSON.stringify(obs);
  if (json.length <= RECORDING_CONFIG.observationTruncateChars) return obs;
  return { _truncated: true, originalLength: json.length, preview: json.slice(0, RECORDING_CONFIG.observationTruncateChars) };
}

function terminationNoteFor(reason: AgentLoopData['terminationReason'], lang: 'zh' | 'en'): string {
  const notes = {
    'text-final':           { zh: '模型给出最终文本答复后停止',     en: 'Model produced a text-only final answer and stopped.' },
    'final-action-called':  { zh: '模型调用了 final-action 工具后停止', en: 'Model called the designated final-action tool.' },
    'max-iter':             { zh: '达到最大迭代次数(录制失败信号)',   en: 'Reached MAX_ITERATIONS (recording-failure signal).' },
  } as const;
  return notes[reason][lang];
}
