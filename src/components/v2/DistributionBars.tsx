import { ProbBar } from '@/components/whiteboard/ProbBar';
import type { TokenProb } from '@/microscope/dist';
import { probFromTopK } from '@/utils/probFromTopK';

export function DistributionBars({ topK, highlightToken }: { topK: TokenProb[]; highlightToken?: string }) {
  const probs = probFromTopK(topK.map((t) => t.logprob));
  const max = Math.max(...probs);
  return (
    <div className="space-y-1.5">
      {topK.map((t, i) => (
        <ProbBar key={i} token={t.token} prob={probs[i]!} max={max} highlight={t.token === highlightToken} />
      ))}
    </div>
  );
}
