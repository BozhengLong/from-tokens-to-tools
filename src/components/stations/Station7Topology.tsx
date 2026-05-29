import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { Card } from '@/components/whiteboard/Card';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';

export function Station7Topology() {
  const { t } = useLanguage();
  const res = useStationData('topology');

  return (
    <StationSection index={7} name={t('st7Name')} hook={t('st7Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { reactive, deliberative } = res.data;
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="mb-2 font-mono text-sm text-whiteboard-accent-blue">{t('reactiveLabel')}</div>
              <ol className="space-y-1.5 text-sm">
                {reactive.iterations.map((it, i) => (
                  <li key={i} className="font-mono text-xs"><span className="text-whiteboard-ink/40">{i + 1}.</span> {it.action.name}</li>
                ))}
              </ol>
              <div className="mt-2 font-mono text-[10px] text-whiteboard-ink/40">■ {reactive.terminationReason}</div>
            </Card>
            <Card>
              <div className="mb-2 font-mono text-sm text-whiteboard-accent-orange">{t('deliberativeLabel')}</div>
              <div className="mb-2 text-xs text-whiteboard-ink/60">plan:</div>
              <ol className="space-y-1 text-sm">
                {deliberative.plan.map((p, i) => (
                  <li key={p.id} className="text-xs">{i + 1}. {p.stepLabel}</li>
                ))}
              </ol>
              <div className="mt-3 mb-1 text-xs text-whiteboard-ink/60">execution:</div>
              <ol className="space-y-1">
                {deliberative.execution.map((e, i) => (
                  <li key={i} className={`font-mono text-xs ${e.deviated ? 'text-whiteboard-accent-orange' : ''}`}>
                    {i + 1}. {e.actualCall.name}{e.deviated ? ' ⚠︎' : ''}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-whiteboard-ink/60">{deliberative.deviationSummary}</p>
            </Card>
          </div>
        );
      })()}
    </StationSection>
  );
}
