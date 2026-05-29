import { motion, AnimatePresence } from 'framer-motion';
import type { Beat, TokenFallback } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { useV2Store } from '@/state/v2-store';
import { BeatCard } from './BeatCard';
import { ZoomLevelView } from './ZoomLevelView';
import { TokenMicroscopeView } from './TokenMicroscopeView';

export function ZoomStage({ beats, tokenFallback, lang }: { beats: Beat[]; tokenFallback: TokenFallback; lang: Lang }) {
  const { panIndex, zoomDepth } = useV2Store();
  const beat = beats[panIndex]!;
  const atLevel = zoomDepth > 0 && beat.zoom ? beat.zoom.levels[zoomDepth - 1] : null;
  const isDeepest = !!beat.zoom && zoomDepth === beat.zoom.levels.length;
  const ref = beat.zoom?.tokenFallbackRef;
  const microscope = isDeepest && ref
    ? <TokenMicroscopeView fallback={tokenFallback} beatId={ref.split('#')[1]!} seedContext={beat.zoom?.seedContext} lang={lang} />
    : null;

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${panIndex}-${zoomDepth}`}
          initial={{ opacity: 0, scale: zoomDepth > 0 ? 0.92 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: zoomDepth > 0 ? 1.04 : 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full"
        >
          {atLevel ? <ZoomLevelView level={atLevel} lang={lang} deepest={microscope} /> : <BeatCard beat={beat} lang={lang} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
