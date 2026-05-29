export function InkArrow({ direction = 'right', className = '' }: { direction?: 'right' | 'down'; className?: string }) {
  const rot = direction === 'down' ? 'rotate-90' : '';
  return (
    <svg viewBox="0 0 48 24" className={`h-6 w-12 text-whiteboard-ink/70 ${rot} ${className}`} aria-hidden="true">
      <path d="M2 12 H40 M32 5 L42 12 L32 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
