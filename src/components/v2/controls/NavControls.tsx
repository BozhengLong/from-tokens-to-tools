import { useEffect } from 'react';
import type { Beat } from '@/types/v2-schemas';
import { useV2Store } from '@/state/v2-store';
import { useV2Strings } from '@/i18n/v2-strings';

export function NavControls({ beats }: { beats: Beat[] }) {
  const { lang, panIndex, zoomDepth, hasDescended, next, back, zoomIn, zoomOut } = useV2Store();
  const t = useV2Strings(lang);
  const beat = beats[panIndex]!;
  const maxDepth = beat.zoom ? beat.zoom.levels.length : 0;
  const canZoomIn = zoomDepth < maxDepth;
  const firstModelBeat = beats.findIndex((b) => b.kind === 'model-speaks');
  const nudgeDescend = !hasDescended && panIndex === firstModelBeat && zoomDepth === 0 && maxDepth > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next(beats.length);
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'ArrowDown' && canZoomIn) zoomIn(maxDepth);
      else if (e.key === 'ArrowUp') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beats.length, canZoomIn, maxDepth, next, back, zoomIn, zoomOut]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-whiteboard-ink/20 bg-whiteboard-bg/95 px-3 py-2 shadow-[2px_2px_0_0_rgba(26,26,26,0.15)] backdrop-blur">
      <button type="button" onClick={back} className="rounded px-3 py-1 text-sm hover:bg-whiteboard-ink/10">{t('back')}</button>
      {canZoomIn ? (
        <button type="button" onClick={() => zoomIn(maxDepth)} className={`rounded border px-3 py-1 text-sm ${nudgeDescend ? 'animate-pulse border-whiteboard-accent-orange bg-whiteboard-accent-orange/15 text-whiteboard-accent-orange' : 'border-whiteboard-accent-blue text-whiteboard-accent-blue'}`}>{t('lookInside')}</button>
      ) : zoomDepth > 0 ? (
        <button type="button" onClick={zoomOut} className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5">{t('backToMap')}</button>
      ) : null}
      <button type="button" onClick={() => next(beats.length)} className={`rounded px-3 py-1 text-sm hover:bg-whiteboard-ink/10 ${nudgeDescend ? 'opacity-40' : ''}`}>{t('next')}</button>
    </div>
  );
}
