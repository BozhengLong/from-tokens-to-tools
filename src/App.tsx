import { useV2Store } from '@/state/v2-store';
import { useStoryData } from '@/hooks/useStoryData';
import { useV2Strings } from '@/i18n/v2-strings';
import { Intro } from '@/components/v2/Intro';
import { Epilogue } from '@/components/v2/Epilogue';
import { ZoomStage } from '@/components/v2/ZoomStage';
import { NavControls } from '@/components/v2/controls/NavControls';
import { Breadcrumb } from '@/components/v2/Breadcrumb';
import { ExampleSwitcher } from '@/components/v2/ExampleSwitcher';

export default function App() {
  const { exampleId, lang, panIndex, setLang } = useV2Store();
  const t = useV2Strings(lang);
  const res = useStoryData(exampleId);

  return (
    <div className="bg-whiteboard-bg text-whiteboard-ink font-sans">
      <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        className="fixed right-4 top-4 z-50 rounded border border-whiteboard-ink/30 bg-whiteboard-bg/90 px-3 py-1 text-sm backdrop-blur">{t('langToggle')}</button>

      {res.status === 'loading' && <div className="flex min-h-screen items-center justify-center font-mono text-whiteboard-ink/50">…</div>}
      {res.status === 'error' && <div className="flex min-h-screen items-center justify-center">{t('dataUnavailable')}</div>}
      {res.status === 'ready' && (() => {
        const { story, tokenFallback } = res;
        const taskPrompt = story.beats[0]?.summary[lang] ?? '';
        return (
          <>
            <ExampleSwitcher />
            <Breadcrumb beatCount={story.beats.length} />
            {/* Intro shows only at the very start (beat 0) for a clean landing */}
            {panIndex === 0 ? <Intro lang={lang} taskPrompt={taskPrompt} /> : null}
            <ZoomStage beats={story.beats} tokenFallback={tokenFallback} lang={lang} />
            {panIndex === story.beats.length - 1 ? <Epilogue lang={lang} /> : null}
            <NavControls beats={story.beats} />
          </>
        );
      })()}
    </div>
  );
}
