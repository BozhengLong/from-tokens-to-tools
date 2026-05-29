// Parse a Claude Code session .jsonl into ordered raw beats. This is the MECHANICAL
// half; curation (selecting/trimming/authoring zoom content) is a separate human/LLM pass.
export type RawBeat =
  | { kind: 'user'; text: string }
  | { kind: 'model-speaks'; thought: string; toolCall?: { name: string; arguments: Record<string, unknown> } }
  | { kind: 'runtime-acts'; observation: string }
  | { kind: 'final'; text: string };

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: unknown };

export function harvestTranscript(jsonl: string): RawBeat[] {
  const lines = jsonl.split('\n').map((l) => l.trim()).filter(Boolean);
  const beats: RawBeat[] = [];

  for (const line of lines) {
    let evt: any;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== 'user' && evt.type !== 'assistant') continue; // drop mode/hook/etc noise
    const content: Block[] = evt.message?.content ?? [];
    const text = content
      .filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (evt.type === 'user') {
      const result = content.find((b): b is Extract<Block, { type: 'tool_result' }> => b.type === 'tool_result');
      if (result) {
        const obs = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        beats.push({ kind: 'runtime-acts', observation: obs });
      } else if (text) {
        beats.push({ kind: 'user', text });
      }
    } else { // assistant
      const call = content.find((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
      if (call) {
        beats.push({ kind: 'model-speaks', thought: text, toolCall: { name: call.name, arguments: call.input } });
      } else if (text) {
        beats.push({ kind: 'final', text });
      }
    }
  }
  return beats;
}
