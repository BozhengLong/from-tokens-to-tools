import { describe, it, expect } from 'vitest';
import { topKFromLogits, sampleIndex } from './dist';

describe('topKFromLogits', () => {
  it('returns the k highest-logit indices, descending', () => {
    const logits = [0.1, 5.0, -2.0, 3.0];
    const top = topKFromLogits(logits, 2);
    expect(top.map((t) => t.id)).toEqual([1, 3]);
    expect(top[0]!.logprob).toBeGreaterThan(top[1]!.logprob);
  });

  it('logprobs are log-softmax (negative, exp-sums-to≤1 over full set)', () => {
    const logits = [0, 0, 0, 0];
    const top = topKFromLogits(logits, 4);
    // uniform over 4 -> each prob 0.25 -> logprob ln(0.25)
    top.forEach((t) => expect(Math.exp(t.logprob)).toBeCloseTo(0.25, 5));
  });
});

describe('sampleIndex', () => {
  it('temperature 0 always returns the argmax', () => {
    const probs = [0.1, 0.7, 0.2];
    for (let i = 0; i < 20; i++) expect(sampleIndex(probs, 0, () => Math.random())).toBe(1);
  });

  it('uses the injected RNG to pick by cumulative probability', () => {
    const probs = [0.2, 0.3, 0.5];
    expect(sampleIndex(probs, 1, () => 0.0)).toBe(0);   // first bucket
    expect(sampleIndex(probs, 1, () => 0.25)).toBe(1);  // into second
    expect(sampleIndex(probs, 1, () => 0.99)).toBe(2);  // last
  });
});
