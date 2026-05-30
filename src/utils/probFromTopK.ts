import { softmaxFromLogprobs } from './sampling';
// Re-normalize the recorded top-k logprobs into a display distribution over just the
// visible tokens (so the bars sum to 1 within the top-k). `temperature` reshapes it the
// canonical way — softmax(logprob / T): T < 1 sharpens (spikier, more certain), T > 1
// flattens (more uniform, more random). T = 1 is the model's true distribution. This is
// pure client-side math on the shown logprobs — no model needed, works in recorded mode.
export function probFromTopK(logprobs: number[], temperature = 1): number[] {
  const t = Math.max(temperature, 1e-6); // guard against divide-by-zero
  return softmaxFromLogprobs(logprobs.map((l) => l / t));
}
