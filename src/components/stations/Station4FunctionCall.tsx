import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { InkArrow } from '@/components/whiteboard/InkArrow';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { formatPct } from '@/utils/format';
import { softmaxFromLogprobs } from '@/utils/sampling';

export function Station4FunctionCall() {
  const { t } = useLanguage();
  const res = useStationData('function-calls');
  const [showCandidates, setShowCandidates] = useState(false);

  return (
    <StationSection index={4} name={t('st4Name')} hook={t('st4Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { reasoning, toolCandidates, call } = res.data;
        const probs = softmaxFromLogprobs(toolCandidates.map((c) => c.logprob));
        return (
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Card>
              <div className="mb-1 font-mono text-xs text-whiteboard-ink/50">{t('thoughtLabel')}</div>
              <p className="text-sm leading-relaxed">{reasoning}</p>
              <button type="button" onClick={() => setShowCandidates((v) => !v)} className="mt-3 text-xs text-whiteboard-accent-blue underline">
                {t('showTopCandidates')}
              </button>
              {showCandidates && (
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {toolCandidates.map((c, i) => (
                    <li key={i} className="flex justify-between"><span>{c.name}</span><span className="text-whiteboard-ink/50">{formatPct(probs[i]!)}</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <InkArrow direction="right" className="hidden md:block" />
            <Card className="border-whiteboard-accent-orange">
              <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}</div>
              <JsonBlock value={call} />
            </Card>
          </div>
        );
      })()}
    </StationSection>
  );
}
