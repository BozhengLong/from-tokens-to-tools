import { useAppStore } from '@/state/store';

export function LanguageToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="rounded border border-whiteboard-ink/40 px-3 py-1 text-sm hover:bg-whiteboard-ink/5"
      aria-label="Toggle language"
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
