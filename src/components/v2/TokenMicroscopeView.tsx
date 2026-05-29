import { useState } from 'react';
import type { Lang } from '@/state/v2-store';
import type { TokenFallback } from '@/types/v2-schemas';
import { useMicroscope } from '@/hooks/useMicroscope';
import { useV2Strings } from '@/i18n/v2-strings';
import { DistributionBars } from './DistributionBars';
import { SourceHandoff } from './SourceHandoff';
import { TokenChip } from '@/components/whiteboard/TokenChip';

export function TokenMicroscopeView({ fallback, beatId, seedContext, lang }: {
  fallback: TokenFallback; beatId: string; seedContext?: string; lang: Lang;
}) {
  const t = useV2Strings(lang);
  const { mode, steps, progress, temperature, loadLive, resample } = useMicroscope(fallback, beatId, seedContext);
  const [stepIdx, setStepIdx] = useState(0);
  if (!steps.length) return null;
  const safe = Math.min(stepIdx, steps.length - 1);
  const step = steps[safe]!;
  const isLive = mode === 'live';

  return (
    <div className="rounded-lg border border-whiteboard-ink/20 bg-white/40 p-4">
      <SourceHandoff lang={lang} />
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-whiteboard-ink/60">{t('nextTokenTitle')}</span>
        <span className="rounded bg-whiteboard-ink/10 px-2 py-0.5 font-mono text-[10px]">{isLive ? t('liveBadge') : t('recordedBadge')}</span>
      </div>

      {/* the running context + the token chosen so far */}
      <div className="mb-2 font-mono text-xs text-whiteboard-ink/50">…{(seedContext ?? fallback[beatId]?.prompt ?? '').slice(-44)}</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {steps.slice(0, safe + 1).map((s, i) => <TokenChip key={i} text={s.chosen.token} active={i === safe} />)}
      </div>

      <DistributionBars topK={step.topK} highlightToken={step.chosen.token} />

      <div className="mt-3 flex items-center gap-3">
        <input type="range" min={0} max={steps.length - 1} value={safe} onChange={(e) => setStepIdx(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
        <span className="font-mono text-xs text-whiteboard-ink/50">{safe + 1}/{steps.length}</span>
      </div>

      {mode === 'recorded' && (
        <button type="button" onClick={loadLive} className="mt-4 rounded border border-whiteboard-accent-blue px-3 py-1.5 text-sm text-whiteboard-accent-blue hover:bg-whiteboard-accent-blue/10">
          {t('loadLiveModel')}
        </button>
      )}
      {mode === 'loading-live' && <p className="mt-4 font-mono text-sm text-whiteboard-ink/60">{t('loadingModel')} {Math.round(progress)}%</p>}
      {mode === 'live-failed' && <p className="mt-4 font-mono text-sm text-whiteboard-accent-orange">{t('liveFailed')}</p>}
      {isLive && (
        <div className="mt-4">
          <p className="mb-1 font-mono text-sm text-whiteboard-accent-blue">{t('liveReady')}</p>
          <label className="flex items-center gap-2 font-mono text-sm">{t('temperature')}: {temperature.toFixed(2)}
            <input type="range" min={0} max={2} step={0.05} value={temperature} onChange={(e) => resample(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
          </label>
        </div>
      )}
    </div>
  );
}
