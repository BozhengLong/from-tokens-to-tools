import { useAppStore } from '@/state/store';
import { EXAMPLES } from '@/examples/registry';
import { useLanguage } from '@/i18n/useLanguage';

export function ExampleSelector() {
  const { lang } = useLanguage();
  const exampleId = useAppStore((s) => s.exampleId);
  const setExample = useAppStore((s) => s.setExample);
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((ex) => (
        <button
          key={ex.id}
          type="button"
          onClick={() => setExample(ex.id)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            ex.id === exampleId
              ? 'border-whiteboard-accent-blue bg-whiteboard-accent-blue text-white'
              : 'border-whiteboard-ink/30 hover:bg-whiteboard-ink/5'
          }`}
        >
          {ex.name[lang]}
        </button>
      ))}
    </div>
  );
}
