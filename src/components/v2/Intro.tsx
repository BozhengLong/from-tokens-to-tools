import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useV2Strings } from '@/i18n/v2-strings';

export function Intro({ lang, taskPrompt }: { lang: Lang; taskPrompt: string }) {
  const t = useV2Strings(lang);
  return (
    <section className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <ChalkHeading level={1}>{t('appTitle')}</ChalkHeading>
      <p className="mt-6 text-lg text-whiteboard-ink/70">{t('subtitle')}</p>
      <div className="mt-8 rounded-lg border-2 border-whiteboard-ink/30 bg-white/40 px-4 py-2 font-mono text-sm">{taskPrompt}</div>
      <p className="mt-10 font-mono text-sm text-whiteboard-ink/40">{t('start')}</p>
    </section>
  );
}
