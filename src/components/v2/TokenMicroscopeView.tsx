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
  const { mode, steps, progress, phase, temperature, setTemperature, context, setContext, capability, loadLive, resample } = useMicroscope(fallback, beatId, seedContext);
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

      <DistributionBars topK={step.topK} highlightToken={step.chosen.token} temperature={temperature} />

      <div className="mt-3 flex items-center gap-3">
        <input type="range" min={0} max={steps.length - 1} value={safe} onChange={(e) => setStepIdx(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
        <span className="font-mono text-xs text-whiteboard-ink/50">{safe + 1}/{steps.length}</span>
      </div>

      {/* Temperature reshapes the SAME scores above, instantly — pure client math, no
          model needed. Works in recorded mode too: this is the canonical temperature lesson. */}
      <div className="mt-3">
        <label className="flex items-center gap-2 font-mono text-xs text-whiteboard-ink/60">
          {t('temperature')}: {temperature.toFixed(2)}
          <input type="range" min={0.1} max={2} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="flex-1 accent-whiteboard-accent-orange" />
        </label>
        <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-whiteboard-ink/40">{t('tempHint')}</p>
      </div>

      {/* Live is opt-in and only offered where it can actually run: WebGPU present AND
          weights served same-origin. Otherwise we don't dangle a button that fails —
          we say why, and the recorded bars above remain the full, real experience. */}
      {mode === 'recorded' && capability === 'ready' && (
        <div className="mt-4 rounded-md border border-whiteboard-accent-blue/40 bg-whiteboard-accent-blue/5 p-3">
          <p className="text-sm text-whiteboard-ink/80">{t('livePitch')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={loadLive} className="rounded border border-whiteboard-accent-blue px-3 py-1.5 text-sm font-medium text-whiteboard-accent-blue hover:bg-whiteboard-accent-blue/10">
              {t('liveCta')}
            </button>
            <span className="font-mono text-xs text-whiteboard-ink/45">{t('liveCostNote')}</span>
          </div>
        </div>
      )}
      {mode === 'recorded' && capability === 'no-webgpu' && (
        <p className="mt-4 font-mono text-xs leading-relaxed text-whiteboard-ink/45">{t('liveNoWebGPU')}</p>
      )}
      {mode === 'recorded' && capability === 'unavailable' && (
        <p className="mt-4 font-mono text-xs leading-relaxed text-whiteboard-ink/45">{t('liveRunLocal')}</p>
      )}

      {mode === 'loading-live' && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between font-mono text-xs text-whiteboard-ink/60">
            <span>{phase === 'compile' ? t('liveCompiling') : t('liveDownloading')}</span>
            {phase === 'download' && <span>{Math.round(progress)}%</span>}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-whiteboard-ink/10">
            <div
              className={`h-full rounded-full bg-whiteboard-accent-blue ${phase === 'compile' ? 'w-full animate-pulse' : 'transition-[width] duration-300'}`}
              style={phase === 'download' ? { width: `${progress}%` } : undefined}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-whiteboard-ink/40">{t('liveCostNote')}</p>
        </div>
      )}
      {mode === 'live-failed' && <p className="mt-4 font-mono text-sm text-whiteboard-accent-orange">{t('liveFailed')}</p>}

      {/* Live's one unique power over the recording: type your OWN context and re-run.
          (Temperature already works above without loading anything.) */}
      {isLive && (
        <div className="mt-4 rounded-md border border-whiteboard-accent-blue/30 bg-whiteboard-accent-blue/5 p-3">
          <p className="mb-2 font-mono text-xs text-whiteboard-accent-blue">{t('liveReady')}</p>
          <label className="mb-1 block font-mono text-[11px] text-whiteboard-ink/60">{t('yourPrompt')}</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            className="w-full resize-y rounded border border-whiteboard-ink/20 bg-white/60 p-2 font-mono text-xs leading-relaxed text-whiteboard-ink/80"
          />
          <button type="button" onClick={resample} className="mt-2 rounded border border-whiteboard-accent-blue px-3 py-1 text-sm font-medium text-whiteboard-accent-blue hover:bg-whiteboard-accent-blue/10">
            {t('resample')} ▸
          </button>
        </div>
      )}
    </div>
  );
}
