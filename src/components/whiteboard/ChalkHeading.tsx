import type { ReactNode } from 'react';

export function ChalkHeading({ children, level = 2 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const sizes = { 1: 'text-4xl md:text-5xl', 2: 'text-2xl md:text-3xl', 3: 'text-xl' };
  const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
  return <Tag className={`font-hand ${sizes[level]} text-whiteboard-ink`}>{children}</Tag>;
}
