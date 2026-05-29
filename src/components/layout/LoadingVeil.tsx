import { useLanguage } from '@/i18n/useLanguage';

export function LoadingVeil({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 py-8 text-whiteboard-ink/50">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-whiteboard-accent-orange" />
      <span className="font-mono text-sm">{message ?? t('loading')}</span>
    </div>
  );
}
