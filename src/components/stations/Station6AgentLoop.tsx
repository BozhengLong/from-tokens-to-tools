import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station6AgentLoop() {
  const { t } = useLanguage();
  const res = useStationData('topology');
  const [step, setStep] = useState(1);

  return (
    <StationSection index={6} name={t('st6Name')} hook={t('st6Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const loop = res.data.reactive;
        const shown = Math.min(step, loop.iterations.length);
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep((s) => Math.min(s + 1, loop.iterations.length))} className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5">
                {t('stepForward')} ▶
              </button>
              <span className="font-mono text-xs text-whiteboard-ink/60">{shown}/{loop.iterations.length}</span>
            </div>
            <div className="space-y-3">
              {loop.iterations.slice(0, shown).map((it, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <div className="font-mono text-xs text-whiteboard-ink/50">{t('thoughtLabel')} #{i + 1}</div>
                    {it.thought && <p className="my-1 text-sm">{it.thought}</p>}
                    <div className="mt-2 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}: {it.action.name}</div>
                    <JsonBlock value={it.action.arguments} className="mt-1" />
                  </Card>
                </motion.div>
              ))}
            </div>
            {shown === loop.iterations.length && (
              <Card className="border-whiteboard-accent-blue">
                <div className="font-mono text-xs text-whiteboard-accent-blue">■ {loop.terminationReason}</div>
                <p className="mt-1 text-sm">{loop.terminationNote}</p>
                {loop.finalText && <p className="mt-2 text-sm text-whiteboard-ink/70">{loop.finalText}</p>}
              </Card>
            )}
          </div>
        );
      })()}
    </StationSection>
  );
}
