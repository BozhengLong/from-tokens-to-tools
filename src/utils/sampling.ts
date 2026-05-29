// Pure math for Station 3. Operates on the top-K logprobs we recorded; the
// temperature slider re-softmaxes within that visible subset (see design §6).
export function softmaxFromLogprobs(logprobs: number[]): number[] {
  const max = Math.max(...logprobs);
  const exps = logprobs.map((lp) => Math.exp(lp - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Temperature scaling: divide logits by T before softmax. We only have logprobs
// (= log p, proportional to logits up to a constant), which is fine because the
// shared constant cancels in softmax. T=0 is treated as argmax (one-hot).
export function applyTemperature(logprobs: number[], temperature: number): number[] {
  if (temperature <= 0) {
    const maxIdx = logprobs.indexOf(Math.max(...logprobs));
    return logprobs.map((_, i) => (i === maxIdx ? 1 : 0));
  }
  return softmaxFromLogprobs(logprobs.map((lp) => lp / temperature));
}
