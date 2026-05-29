import { useV2Store } from '@/state/v2-store';
import { useV2Strings } from '@/i18n/v2-strings';

export function Breadcrumb({ beatCount }: { beatCount: number }) {
  const { lang, panIndex, zoomDepth } = useV2Store();
  const t = useV2Strings(lang);
  return (
    <div className="fixed left-4 top-4 z-50 rounded-full border border-whiteboard-ink/20 bg-whiteboard-bg/90 px-3 py-1 font-mono text-xs text-whiteboard-ink/60 backdrop-blur">
      {t('beat')} {panIndex + 1}/{beatCount}
      {zoomDepth > 0 && <span className="ml-2 text-whiteboard-accent-orange">{t('depth')} L{zoomDepth}</span>}
    </div>
  );
}
