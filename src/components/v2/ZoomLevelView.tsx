import type { ReactNode } from 'react';
import type { ZoomLevel } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { Card } from '@/components/whiteboard/Card';
import { Callout } from './Callout';

export function ZoomLevelView({ level, lang, deepest }: { level: ZoomLevel; lang: Lang; deepest?: ReactNode }) {
  return (
    <Card className="mx-auto max-w-2xl border-whiteboard-accent-blue/40">
      <div className="mb-1 font-mono text-xs uppercase text-whiteboard-accent-blue">L{level.level}</div>
      <ChalkHeading level={3}>{level.title[lang]}</ChalkHeading>
      <p className="mt-2 leading-relaxed text-whiteboard-ink/80">{level.body[lang]}</p>
      {level.callouts?.map((c, i) => <Callout key={i} callout={c} lang={lang} />)}
      {deepest && <div className="mt-4">{deepest}</div>}
    </Card>
  );
}
