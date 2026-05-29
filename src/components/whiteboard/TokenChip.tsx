type Props = {
  text: string;
  id?: number;
  active?: boolean;
  title?: string;
  onHover?: () => void;
};

export function TokenChip({ text, id, active = false, title, onHover }: Props) {
  const display = text.replace(/ /g, '␣').replace(/\n/g, '⏎');
  return (
    <span
      title={title}
      onMouseEnter={onHover}
      className={`inline-flex flex-col items-center rounded-md border px-2 py-1 font-mono text-sm transition-colors ${
        active ? 'border-whiteboard-accent-orange bg-whiteboard-accent-orange/15' : 'border-whiteboard-ink/40 bg-white/50'
      }`}
    >
      <span>{display}</span>
      {id !== undefined && <span className="text-[10px] text-whiteboard-ink/50">{id}</span>}
    </span>
  );
}
