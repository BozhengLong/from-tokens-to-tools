import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChalkHeading } from '@/components/whiteboard/ChalkHeading';

type Props = {
  index: number;
  name: string;
  hook: string;
  children: ReactNode;
};

export function StationSection({ index, name, hook, children }: Props) {
  return (
    <section className="mx-auto min-h-screen max-w-3xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-2 font-mono text-sm text-whiteboard-ink/40">{String(index).padStart(2, '0')}</div>
        <ChalkHeading level={2}>{name}</ChalkHeading>
        <p className="mt-3 font-hand text-xl text-whiteboard-accent-blue">{hook}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
    </section>
  );
}
