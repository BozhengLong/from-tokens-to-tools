import type { Beat } from '@/types/v2-schemas';
import type { Lang } from '@/state/v2-store';
import { Card } from '@/components/whiteboard/Card';
import { JsonBlock } from '@/components/whiteboard/JsonBlock';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';

const KIND_BADGE: Record<Beat['kind'], string> = {
  user: '🧑 you', 'model-speaks': '🤖 model speaks', 'runtime-acts': '⚙️ runtime acts', final: '🏁 done',
};

export function BeatCard({ beat, lang }: { beat: Beat; lang: Lang }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-2 font-mono text-xs uppercase text-whiteboard-ink/40">{KIND_BADGE[beat.kind]}</div>
      <ChalkHeading level={2}>{beat.title[lang]}</ChalkHeading>
      <p className="mt-3 text-lg text-whiteboard-ink/80">{beat.summary[lang]}</p>
      {beat.thought && beat.kind !== 'user' && (
        <p className="mt-3 border-l-2 border-whiteboard-ink/20 pl-3 font-mono text-sm text-whiteboard-ink/60">{beat.thought}</p>
      )}
      {beat.toolCall && (
        <div className="mt-3">
          <div className="mb-1 font-mono text-xs text-whiteboard-accent-orange">→ {beat.toolCall.name}</div>
          <JsonBlock value={beat.toolCall.arguments} />
        </div>
      )}
      {beat.observation && (
        <pre className="mt-3 max-h-56 overflow-auto rounded bg-whiteboard-ink/[0.05] p-3 font-mono text-xs leading-relaxed">{beat.observation}</pre>
      )}
    </Card>
  );
}
