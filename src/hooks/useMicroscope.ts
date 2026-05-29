import { useEffect, useRef, useState } from 'react';
import type { TokenFallback } from '@/types/v2-schemas';
import type { MicroscopeStep, TokenMicroscope } from '@/microscope/types';
import { RecordedMicroscope } from '@/microscope/recorded';

type Mode = 'recorded' | 'loading-live' | 'live' | 'live-failed';

const MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct';

export function useMicroscope(fallback: TokenFallback, beatId: string, seedContext?: string) {
  const [mode, setMode] = useState<Mode>('recorded');
  const [steps, setSteps] = useState<MicroscopeStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const liveRef = useRef<TokenMicroscope | null>(null); // holds the live instance across renders
  const seed = seedContext ?? fallback[beatId]?.prompt ?? '';

  // recorded default — from the captured data; always works, no model load
  useEffect(() => {
    let cancelled = false;
    setMode('recorded');
    liveRef.current = null;
    new RecordedMicroscope(fallback, beatId).generateSteps('', 8, 0).then((s) => { if (!cancelled) setSteps(s); });
    return () => { cancelled = true; };
  }, [fallback, beatId]);

  // opt-in live load (browser only). Lazy-imports the live backend so it isn't bundled
  // until the user asks; on success, regenerate steps live from the seed context.
  const loadLive = async () => {
    setMode('loading-live');
    try {
      const { LiveMicroscope } = await import('@/microscope/live');
      const m = await LiveMicroscope.create(MODEL_ID, setProgress);
      liveRef.current = m;
      setSteps(await m.generateSteps(seed, 8, temperature));
      setMode('live');
    } catch {
      setMode('live-failed'); // stay on the recorded steps
    }
  };

  const resample = async (temp: number) => {
    setTemperature(temp);
    if (liveRef.current) setSteps(await liveRef.current.generateSteps(seed, 8, temp));
  };

  return { mode, steps, progress, temperature, loadLive, resample };
}
