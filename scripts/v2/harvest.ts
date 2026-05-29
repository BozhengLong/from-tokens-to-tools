// Parse a Claude Code session .jsonl into ordered raw beats. This is the MECHANICAL
// half; curation (selecting/trimming/authoring zoom content) is a separate human/LLM pass.
//
// Real-transcript shape (verified against a captured session):
// - noise event types (mode, permission-mode, attachment, file-history-snapshot,
//   system, last-prompt, ai-title) are dropped.
// - `message.content` is EITHER a plain string (a user prompt) OR an array of blocks.
// - assistant turns are granular: separate events for `thinking`, `text`, `tool_use`.
//   We accumulate narration/thinking and attach it to the next tool call as its thought;
//   trailing narration with no following tool call becomes the `final` beat.
export type RawBeat =
  | { kind: 'user'; text: string }
  | { kind: 'model-speaks'; thought: string; toolCall?: { name: string; arguments: Record<string, unknown> } }
  | { kind: 'runtime-acts'; observation: string }
  | { kind: 'final'; text: string };

type Block = { type: string; [k: string]: unknown };

// CC message.content is either a plain string (a user turn) or an array of blocks.
function normalizeContent(content: unknown): Block[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  if (Array.isArray(content)) return content as Block[];
  return [];
}

function blockText(b: Block): string {
  if (b.type === 'text') return String(b.text ?? '');
  if (b.type === 'thinking') return String(b.thinking ?? '');
  return '';
}

export function harvestTranscript(jsonl: string): RawBeat[] {
  const lines = jsonl.split('\n').map((l) => l.trim()).filter(Boolean);
  const beats: RawBeat[] = [];
  let pendingThought = ''; // assistant narration/thinking awaiting its tool call

  const addThought = (t: string) => { if (t) pendingThought += (pendingThought ? '\n' : '') + t; };

  for (const line of lines) {
    let evt: { type?: string; message?: { content?: unknown } };
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== 'user' && evt.type !== 'assistant') continue; // drop noise event types
    const blocks = normalizeContent(evt.message?.content);

    if (evt.type === 'user') {
      const result = blocks.find((b) => b.type === 'tool_result');
      if (result) {
        const obs = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        beats.push({ kind: 'runtime-acts', observation: obs });
      } else {
        const text = blocks.map(blockText).join('\n').trim();
        if (text) beats.push({ kind: 'user', text });
      }
    } else {
      // assistant: blocks may be split across events; accumulate, attach to tool calls
      for (const b of blocks) {
        if (b.type === 'tool_use') {
          beats.push({
            kind: 'model-speaks',
            thought: pendingThought.trim(),
            toolCall: { name: String(b.name ?? ''), arguments: (b.input as Record<string, unknown>) ?? {} },
          });
          pendingThought = '';
        } else {
          addThought(blockText(b));
        }
      }
    }
  }

  const trailing = pendingThought.trim();
  if (trailing) beats.push({ kind: 'final', text: trailing });
  return beats;
}
