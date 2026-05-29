import { describe, it, expect } from 'vitest';
import { RecordedMicroscope } from './recorded';
import type { TokenFallback } from '@/types/v2-schemas';

const fixture: TokenFallback = {
  b1: {
    model: 'qwen3-0.6b',
    prompt: 'You are fixing a failing test. Next action:',
    steps: [
      { chosen: 'run', topK: [
        { token: 'run', id: 6108, logprob: -0.04 },
        { token: 'check', id: 999, logprob: -3.2 },
      ] },
      { chosen: '_tests', topK: [{ token: '_tests', id: 7, logprob: -0.5 }] },
    ],
  },
};

describe('RecordedMicroscope', () => {
  it('replays the recorded steps for a beat', async () => {
    const m = new RecordedMicroscope(fixture, 'b1');
    const steps = await m.generateSteps('ignored', 2, 1);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.chosen.token).toBe('run');
    expect(steps[0]!.topK[0]!.token).toBe('run');
    expect(m.kind).toBe('recorded');
  });

  it('nextTokenTopK returns the first step distribution', async () => {
    const m = new RecordedMicroscope(fixture, 'b1');
    const top = await m.nextTokenTopK('ignored', 5);
    expect(top[0]!.token).toBe('run');
  });

  it('throws for an unknown beat id', () => {
    expect(() => new RecordedMicroscope(fixture, 'nope')).toThrow();
  });
});
