import { softmaxFromLogprobs } from './sampling';
// Re-normalize the recorded top-k logprobs into a display distribution over just
// the visible tokens (so the bars sum to 1 within the top-k). See design §2 token layer.
export function probFromTopK(logprobs: number[]): number[] {
  return softmaxFromLogprobs(logprobs);
}
