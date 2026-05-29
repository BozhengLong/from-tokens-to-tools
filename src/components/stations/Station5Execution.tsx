import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { InkArrow } from '@/components/whiteboard/InkArrow';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station5Execution() {
  const { t } = useLanguage();
  const res = useStationData('topology');
  const [expanded, setExpanded] = useState(false);

  return (
    <StationSection index={5} name={t('st5Name')} hook={t('st5Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const first = res.data.reactive.iterations[0];
        if (!first) return <Card>{t('dataUnavailable')}</Card>;
        return (
          <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Card className="border-whiteboard-accent-orange">
              <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">{t('actionLabel')}</div>
              <JsonBlock value={first.action} />
            </Card>
            <InkArrow direction="right" className="mt-8 hidden md:block" />
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <Card>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-whiteboard-ink/50">{t('observationLabel')}</span>
                  <span className="rounded bg-whiteboard-ink/10 px-1.5 py-0.5 font-mono text-[10px]">📦 sandbox / 🌐 cached</span>
                </div>
                <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-whiteboard-accent-blue underline">
                  {expanded ? '–' : '+'} {t('observationLabel')}
                </button>
                {expanded && <JsonBlock value={first.observation} className="mt-2 max-h-72 overflow-y-auto" />}
                <p className="mt-3 text-xs text-whiteboard-ink/50">{t('st5Hook')}</p>
              </Card>
            </motion.div>
          </div>
        );
      })()}
    </StationSection>
  );
}
