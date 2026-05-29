import { describe, it, expect } from 'vitest';
import { probFromTopK } from './probFromTopK';

describe('probFromTopK', () => {
  it('softmaxes logprobs within the visible top-k (sums ~1)', () => {
    const probs = probFromTopK([-0.84, -1.10, -3.57, -4.01]);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(probs[0]).toBeGreaterThan(probs[1]!);
  });
});
