import { useState } from 'react';
import { motion } from 'framer-motion';
import { StationSection } from '@/components/layout/StationSection';
import { LoadingVeil } from '@/components/layout/LoadingVeil';
import { TokenChip } from '@/components/whiteboard/TokenChip';
import { Card } from '@/components/whiteboard/Card';
import { useStationData } from '@/hooks/useStationData';
import { useLanguage } from '@/i18n/useLanguage';
import { byteToCharRange } from '@/utils/byteToCharRange';

export function Station1Tokenize() {
  const { t } = useLanguage();
  const res = useStationData('tokenize');
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <StationSection index={1} name={t('st1Name')} hook={t('st1Hook')}>
      {res.status === 'loading' && <LoadingVeil />}
      {res.status === 'error' && <Card>{t('dataUnavailable')}</Card>}
      {res.status === 'ready' && (() => {
        const { prompt, tokens } = res.data;
        const hi = hovered !== null ? byteToCharRange(prompt, tokens[hovered]!.byteRange) : null;
        return (
          <div className="space-y-6">
            <Card>
              <div className="font-mono text-sm leading-loose">
                {hi
                  ? <>
                      <span>{prompt.slice(0, hi[0])}</span>
                      <span className="bg-whiteboard-accent-orange/30">{prompt.slice(hi[0], hi[1])}</span>
                      <span>{prompt.slice(hi[1])}</span>
                    </>
                  : prompt}
              </div>
            </Card>
            <div className="flex flex-wrap gap-2">
              {tokens.map((tok, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}>
                  <TokenChip
                    text={tok.text}
                    id={tok.id}
                    active={hovered === i}
                    title={`bytes ${tok.byteRange[0]}–${tok.byteRange[1]}`}
                    onHover={() => setHovered(i)}
                  />
                </motion.div>
              ))}
            </div>
            <p className="font-mono text-xs text-whiteboard-ink/50">{tokens.length} tokens</p>
          </div>
        );
      })()}
    </StationSection>
  );
}
