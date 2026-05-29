// Relative (not '@/...') import: this module is imported by a tsx node script
// (Task 6) which does NOT resolve the '@' vite alias. Relative works everywhere.
import { softmaxFromLogprobs } from '../utils/sampling';

export type TokenProb = { token: string; id: number; logprob: number };

// Full-vocab logits -> the k most likely next tokens, with true log-softmax logprobs.
// `decode` maps a token id to its display string (injected so this stays pure/testable).
export function topKFromLogits(
  logits: number[],
  k: number,
  decode: (id: number) => string = (id) => String(id)
): TokenProb[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const logZ = Math.log(sum) + max; // log-sum-exp
  return logits
    .map((l, id) => ({ token: decode(id), id, logprob: l - logZ }))
    .sort((a, b) => b.logprob - a.logprob)
    .slice(0, k);
}

// Sample an index from a probability array. temperature<=0 => argmax. rng() in [0,1).
export function sampleIndex(probs: number[], temperature: number, rng: () => number): number {
  if (temperature <= 0) return probs.indexOf(Math.max(...probs));
  // re-weight by temperature, then inverse-CDF sample
  const reweighted = softmaxFromLogprobs(probs.map((p) => Math.log(Math.max(p, 1e-12)) / temperature));
  const r = rng();
  let acc = 0;
  for (let i = 0; i < reweighted.length; i++) {
    acc += reweighted[i]!;
    if (r < acc) return i;
  }
  return reweighted.length - 1;
}
