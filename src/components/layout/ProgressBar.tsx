import { motion, useScroll } from 'framer-motion';

export function ProgressBar() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed left-0 top-0 z-50 h-1 origin-left bg-whiteboard-accent-orange"
      style={{ scaleX: scrollYProgress, width: '100%' }}
    />
  );
}
