import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { ProbBar } from '@/components/whiteboard/ProbBar';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { softmaxFromLogprobs } from '@/utils/sampling';

export function Station2Logits() {
  const { t } = useLanguage();
  const res = useStationData('logits');
  const [stepIdx, setStepIdx] = useState(0);

  return (
    <StationSection index={2} name={t('st2Name')} hook={t('st2Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const steps = res.data.steps;
        const safeIdx = Math.min(stepIdx, steps.length - 1);
        const step = steps[safeIdx]!;
        const probs = softmaxFromLogprobs(step.topK.map((k) => k.logprob));
        const max = Math.max(...probs);
        return (
          <div className="space-y-5">
            <Card>
              <div className="mb-1 font-mono text-xs text-whiteboard-ink/50">…{step.contextPreview}</div>
              <div className="font-mono text-sm">next token? →</div>
            </Card>
            <div className="space-y-1.5">
              {step.topK.map((k, i) => (
                <ProbBar key={i} token={k.token} prob={probs[i]!} max={max} highlight={i === 0} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={steps.length - 1} value={safeIdx}
                onChange={(e) => setStepIdx(Number(e.target.value))}
                className="flex-1 accent-whiteboard-accent-orange"
              />
              <span className="font-mono text-xs text-whiteboard-ink/60">step {safeIdx + 1}/{steps.length}</span>
            </div>
            <p className="font-mono text-xs text-whiteboard-ink/40">
              {t('st2Hook')}
            </p>
          </div>
        );
      })()}
    </StationSection>
  );
}
