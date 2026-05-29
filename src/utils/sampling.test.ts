import { describe, it, expect } from 'vitest';
import { softmaxFromLogprobs, applyTemperature } from './sampling';

describe('softmaxFromLogprobs', () => {
  it('returns probabilities summing to 1', () => {
    const probs = softmaxFromLogprobs([-0.1, -1.0, -3.0]);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('higher logprob -> higher probability', () => {
    const [p0, p1] = softmaxFromLogprobs([-0.1, -2.0]);
    expect(p0).toBeGreaterThan(p1);
  });
});

describe('applyTemperature', () => {
  it('temperature 1 leaves the distribution unchanged (within tolerance)', () => {
    const base = softmaxFromLogprobs([-0.1, -1.0, -3.0]);
    const t1 = applyTemperature([-0.1, -1.0, -3.0], 1);
    base.forEach((p, i) => expect(t1[i]).toBeCloseTo(p, 5));
  });

  it('high temperature flattens the distribution (max prob decreases)', () => {
    const cold = applyTemperature([-0.1, -1.0, -3.0], 0.3);
    const hot = applyTemperature([-0.1, -1.0, -3.0], 2.0);
    expect(Math.max(...hot)).toBeLessThan(Math.max(...cold));
  });

  it('temperature 0 collapses to argmax (one-hot)', () => {
    const probs = applyTemperature([-0.1, -1.0, -3.0], 0);
    expect(probs[0]).toBeCloseTo(1, 5);
    expect(probs[1]).toBeCloseTo(0, 5);
  });
});
