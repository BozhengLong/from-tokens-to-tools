import type { Beat, TokenFallback } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { BeatCard } from './BeatCard';
import { ZoomLevelView } from './ZoomLevelView';
import { TokenMicroscopeView } from './TokenMicroscopeView';

export function OutlineMode({ beats, tokenFallback, lang }: { beats: Beat[]; tokenFallback: TokenFallback; lang: Lang }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      {beats.map((beat) => (
        <details key={beat.id} open className="rounded-lg border border-whiteboard-ink/15 p-2">
          <summary className="cursor-pointer font-hand text-xl">{beat.title[lang]}</summary>
          <div className="mt-3"><BeatCard beat={beat} lang={lang} /></div>
          {beat.zoom?.levels.map((lvl, i) => {
            const deepest = i === beat.zoom!.levels.length - 1 && beat.zoom!.tokenFallbackRef;
            return (
              <details key={i} className="mt-2 ml-4 border-l-2 border-whiteboard-accent-blue/30 pl-3">
                <summary className="cursor-pointer font-mono text-sm text-whiteboard-accent-blue">L{lvl.level} {lvl.title[lang]}</summary>
                <div className="mt-2">
                  <ZoomLevelView level={lvl} lang={lang}
                    deepest={deepest ? <TokenMicroscopeView fallback={tokenFallback} beatId={beat.zoom!.tokenFallbackRef!.split('#')[1]!} seedContext={beat.zoom!.seedContext} lang={lang} /> : undefined} />
                </div>
              </details>
            );
          })}
        </details>
      ))}
    </div>
  );
}
