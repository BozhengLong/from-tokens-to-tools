import { describe, it, expect } from 'vitest';
import { probFromTopK } from './probFromTopK';

describe('probFromTopK', () => {
  it('softmaxes logprobs within the visible top-k (sums ~1)', () => {
    const probs = probFromTopK([-0.84, -1.10, -3.57, -4.01]);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(probs[0]).toBeGreaterThan(probs[1]!);
  });

  it('high temperature flattens the distribution (top prob drops, still sums ~1)', () => {
    const lp = [-0.84, -1.1, -3.57, -4.01];
    const hot = probFromTopK(lp, 2);
    const base = probFromTopK(lp, 1);
    expect(hot.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(hot[0]!).toBeLessThan(base[0]!);      // flatter: leading bar shrinks
    expect(hot[3]!).toBeGreaterThan(base[3]!);   // tail rises
  });

  it('low temperature sharpens the distribution (top prob rises)', () => {
    const lp = [-0.84, -1.1, -3.57, -4.01];
    expect(probFromTopK(lp, 0.3)[0]!).toBeGreaterThan(probFromTopK(lp, 1)[0]!);
  });
});
