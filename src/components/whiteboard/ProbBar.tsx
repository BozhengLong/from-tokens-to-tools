import { motion } from 'framer-motion';

type Props = { token: string; prob: number; max: number; highlight?: boolean };

export function ProbBar({ token, prob, max, highlight = false }: Props) {
  const widthPct = max > 0 ? (prob / max) * 100 : 0;
  const display = token.replace(/ /g, '␣').replace(/\n/g, '⏎');
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 truncate text-right font-mono" title={token}>{display}</span>
      <div className="h-4 flex-1 rounded bg-whiteboard-ink/10">
        <motion.div
          className={`h-full rounded ${highlight ? 'bg-whiteboard-accent-orange' : 'bg-whiteboard-accent-blue'}`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-whiteboard-ink/60">
        {(prob * 100).toFixed(1)}%
      </span>
    </div>
  );
}
