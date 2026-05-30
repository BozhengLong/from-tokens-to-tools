import { useV2Store } from '@/state/v2-store';

const EXAMPLES: { id: string; label: { zh: string; en: string } }[] = [
  { id: 'fix-failing-test', label: { zh: '修复测试', en: 'Fix a test' } },
  { id: 'clean-big-files', label: { zh: '清理大文件', en: 'Clean big files' } },
  { id: 'error-recovery', label: { zh: '出错恢复', en: 'Error recovery' } },
];

export function ExampleSwitcher() {
  const { exampleId, lang, setExample } = useV2Store();
  return (
    <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 gap-2">
      {EXAMPLES.map((e) => (
        <button key={e.id} type="button" onClick={() => setExample(e.id)}
          className={`rounded-full border px-3 py-1 text-xs ${e.id === exampleId ? 'border-whiteboard-accent-blue bg-whiteboard-accent-blue text-white' : 'border-whiteboard-ink/30 bg-whiteboard-bg/90 backdrop-blur'}`}>
          {e.label[lang]}
        </button>
      ))}
    </div>
  );
}
