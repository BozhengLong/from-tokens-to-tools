import type { Lang } from '@/state/v2-store';

const COPY: Record<Lang, string> = {
  zh: 'Claude 不公开它的概率。所以这里换成一个你能看穿的小开源模型(SmolLM2-135M),在你的设备上跑——机制完全一样,只是这个能看见内部。',
  en: "Claude doesn't expose its probabilities. So here we swap in a small open model you can see inside (SmolLM2-135M), running on your device — same mechanism, just inspectable.",
};

export function SourceHandoff({ lang }: { lang: Lang }) {
  return (
    <div className="mb-3 rounded-md border-l-4 border-whiteboard-accent-orange bg-whiteboard-accent-orange/10 px-3 py-2 text-sm text-whiteboard-ink/80">
      {COPY[lang]}
    </div>
  );
}
