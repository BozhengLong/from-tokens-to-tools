import { ProgressBar } from './ProgressBar';
import { ExampleSelector } from './ExampleSelector';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '@/i18n/useLanguage';

export function Header() {
  const { t } = useLanguage();
  return (
    <>
      <ProgressBar />
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-whiteboard-ink/15 bg-whiteboard-bg/90 px-4 py-3 backdrop-blur">
        <span className="font-hand text-lg">{t('appTitle')}</span>
        <ExampleSelector />
        <LanguageToggle />
      </header>
    </>
  );
}
