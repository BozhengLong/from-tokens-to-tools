import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border-2 border-whiteboard-ink/70 bg-white/40 p-4 shadow-[2px_2px_0_0_rgba(26,26,26,0.2)] ${className}`}>
      {children}
    </div>
  );
}
