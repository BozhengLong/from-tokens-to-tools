import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { harvestTranscript } from './harvest';

const raw = readFileSync(new URL('./fixtures/sample-transcript.jsonl', import.meta.url), 'utf8');

describe('harvestTranscript', () => {
  const beats = harvestTranscript(raw);

  it('drops noise lines (mode/permission/hooks)', () => {
    expect(beats.every((b) => b.kind !== undefined)).toBe(true);
    expect(beats.length).toBeGreaterThanOrEqual(4);
  });

  it('first beat is the user request', () => {
    expect(beats[0]!.kind).toBe('user');
    expect(beats[0]!.text).toContain('failing');
  });

  it('captures tool calls as model-speaks beats with name+input', () => {
    const call = beats.find((b) => b.kind === 'model-speaks' && b.toolCall?.name === 'Bash');
    expect(call?.toolCall?.arguments).toMatchObject({ command: 'npm test' });
    expect(call?.thought).toContain('run the tests');
  });

  it('captures tool results as runtime-acts beats', () => {
    const obs = beats.find((b) => b.kind === 'runtime-acts');
    expect(obs?.observation).toContain('FAIL');
  });
});
