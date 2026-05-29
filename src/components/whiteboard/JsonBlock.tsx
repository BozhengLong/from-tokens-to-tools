export function JsonBlock({ value, className = '' }: { value: unknown; className?: string }) {
  return (
    <pre className={`overflow-x-auto rounded-md bg-whiteboard-ink/[0.04] p-3 font-mono text-xs leading-relaxed ${className}`}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
