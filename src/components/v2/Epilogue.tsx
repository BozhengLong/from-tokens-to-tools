import type { Lang } from '@/state/v2-store';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useV2Strings } from '@/i18n/v2-strings';

const REPO = 'https://github.com/BozhengLong/from-tokens-to-tools';

export function Epilogue({ lang }: { lang: Lang }) {
  const t = useV2Strings(lang);
  return (
    <section className="mx-auto max-w-2xl px-4 py-32 text-center">
      <ChalkHeading level={1}>{t('epilogueTitle')}</ChalkHeading>
      <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('epilogueBody')}</p>
      <div className="mt-10 flex justify-center gap-6 font-mono text-sm">
        <a className="text-whiteboard-accent-blue underline" href={REPO} target="_blank" rel="noreferrer">{t('linkSource')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/blob/main/docs/recording-notes.md`} target="_blank" rel="noreferrer">{t('linkRecording')}</a>
      </div>
    </section>
  );
}
