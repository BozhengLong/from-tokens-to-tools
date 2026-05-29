import type { Lang } from '@/state/v2-store';
import type { ZoomLevel } from '@/types/v2-schemas';

export function Callout({ callout, lang }: { callout: NonNullable<ZoomLevel['callouts']>[number]; lang: Lang }) {
  return (
    <div className="mt-2 inline-block rounded-md border-2 border-dashed border-whiteboard-accent-orange/70 px-3 py-1 font-hand text-sm text-whiteboard-accent-orange">
      {callout.label[lang]}
    </div>
  );
}
