import { useState } from 'react';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { ProbBar } from '@/components/whiteboard/ProbBar';
import { TokenChip } from '@/components/whiteboard/TokenChip';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { applyTemperature } from '@/utils/sampling';

export function Station3Sampling() {
  const { t, lang } = useLanguage();
  const res = useStationData('sampling');
  const [temp, setTemp] = useState(1);

  return (
    <StationSection index={3} name={t('st3Name')} hook={t('st3Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { baseStepLogprobs, paths } = res.data;
        const probs = applyTemperature(baseStepLogprobs.map((k) => k.logprob), temp);
        const max = Math.max(...probs);
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <label className="font-mono text-sm">{t('temperature')}: {temp.toFixed(2)}</label>
                <input
                  type="range" min={0} max={2} step={0.05} value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="flex-1 accent-whiteboard-accent-orange"
                />
              </div>
              <div className="space-y-1.5">
                {baseStepLogprobs.map((k, i) => (
                  <ProbBar key={i} token={k.token} prob={probs[i]!} max={max} highlight={i === 0} />
                ))}
              </div>
              <p className="mt-2 font-mono text-xs text-whiteboard-ink/40">
                {lang === 'zh' ? '温度只作用在可见 top-20 内部' : 'temperature only re-weights the visible top-20'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paths.map((p) => (
                <Card key={p.method}>
                  <div className="mb-2 font-mono text-xs uppercase text-whiteboard-accent-blue">{p.method}</div>
                  <div className="flex flex-wrap gap-1">
                    {p.tokens.slice(0, 18).map((tk, i) => <TokenChip key={i} text={tk} />)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}
    </StationSection>
  );
}
