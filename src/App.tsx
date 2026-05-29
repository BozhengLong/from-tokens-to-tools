import { Header } from '@/components/layout/Header';
import { Epilogue } from '@/components/layout/Epilogue';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';
import { Station1Tokenize } from '@/components/stations/Station1Tokenize';
import { Station2Logits } from '@/components/stations/Station2Logits';
import { Station3Sampling } from '@/components/stations/Station3Sampling';
import { Station4FunctionCall } from '@/components/stations/Station4FunctionCall';
import { Station5Execution } from '@/components/stations/Station5Execution';
import { Station6AgentLoop } from '@/components/stations/Station6AgentLoop';
import { Station7Topology } from '@/components/stations/Station7Topology';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppStore } from '@/state/store';
import { getExample } from '@/examples/registry';

export default function App() {
  const { t, lang } = useLanguage();
  const exampleId = useAppStore((s) => s.exampleId);
  const task = getExample(exampleId).taskPrompt[lang];
  return (
    <div className="bg-whiteboard-bg text-whiteboard-ink font-sans">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ChalkHeading level={1}>{t('appTitle')}</ChalkHeading>
        <p className="mx-auto mt-6 max-w-xl text-lg text-whiteboard-ink/70">{t('subtitle')}</p>
        <p className="mt-8 font-mono text-sm text-whiteboard-ink/50">▼</p>
        <div className="mt-8 inline-block rounded-lg border-2 border-whiteboard-ink/30 bg-white/40 px-4 py-2 font-mono text-sm">
          {task}
        </div>
      </section>
      {/* key remounts all stations on example/language switch, resetting each
          station's local interaction state (temperature, step counters). */}
      <div key={`${exampleId}-${lang}`}>
        <Station1Tokenize />
        <Station2Logits />
        <Station3Sampling />
        <Station4FunctionCall />
        <Station5Execution />
        <Station6AgentLoop />
        <Station7Topology />
      </div>
      <Epilogue />
    </div>
  );
}
