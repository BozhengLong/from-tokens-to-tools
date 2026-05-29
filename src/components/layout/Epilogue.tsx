import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { useLanguage } from '@/i18n/useLanguage';

const REPO = 'https://github.com/BozhengLong/from-tokens-to-tools';

export function Epilogue() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-3xl px-4 py-32 text-center">
      <ChalkHeading level={1}>{t('epilogueTitle')}</ChalkHeading>
      <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('epilogueBody')}</p>
      <div className="mt-10 flex justify-center gap-6 font-mono text-sm">
        <a className="text-whiteboard-accent-blue underline" href={REPO} target="_blank" rel="noreferrer">{t('linkSource')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/blob/main/docs/recording-notes.md`} target="_blank" rel="noreferrer">{t('linkRecording')}</a>
        <a className="text-whiteboard-accent-blue underline" href={`${REPO}/tree/main/docs/superpowers/specs`} target="_blank" rel="noreferrer">{t('linkSpec')}</a>
      </div>
    </section>
  );
}
