import { useEffect, useRef, useState } from 'react';
import type { TokenFallback } from '@/types/v2-schemas';
import type { MicroscopeStep, TokenMicroscope } from '@/microscope/types';
import { RecordedMicroscope } from '@/microscope/recorded';

type Mode = 'recorded' | 'loading-live' | 'live' | 'live-failed';
type LoadPhase = 'download' | 'compile';
// Whether live resampling is even offerable here:
//   checking     — still probing
//   ready        — WebGPU present AND weights served same-origin → show the button
//   no-webgpu    — browser lacks WebGPU → can't run live at all
//   unavailable  — WebGPU ok but weights aren't served here (e.g. deployed without them,
//                  or explicitly disabled) → suggest running locally
type Capability = 'checking' | 'ready' | 'no-webgpu' | 'unavailable';

const MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct';
const WEIGHTS_PROBE = `/models/${MODEL_ID}/config.json`;

// Probe once per session: is there a WebGPU device, and are the weights actually
// served from our own origin? Detecting WebGPU here (not in live.ts) keeps the heavy
// transformers bundle lazy — we never import it just to decide whether to show a button.
let capabilityPromise: Promise<Capability> | null = null;
function detectCapability(): Promise<Capability> {
  return (capabilityPromise ??= (async () => {
    if (import.meta.env.VITE_LIVE_MODEL === '0') return 'unavailable';
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return 'no-webgpu';
    try {
      const r = await fetch(WEIGHTS_PROBE, { method: 'HEAD' });
      return r.ok ? 'ready' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  })());
}

export function useMicroscope(fallback: TokenFallback, beatId: string, seedContext?: string) {
  const [mode, setMode] = useState<Mode>('recorded');
  const [steps, setSteps] = useState<MicroscopeStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<LoadPhase>('download');
  // Display/sampling temperature. Default 1 = the model's true distribution. The bars
  // re-softmax by this instantly (pure math, any mode); in live mode it also samples the
  // regenerated path. Range is clamped to >0 by the UI slider.
  const [temperature, setTemperature] = useState(1);
  const [capability, setCapability] = useState<Capability>('checking');
  const liveRef = useRef<TokenMicroscope | null>(null); // holds the live instance across renders
  const seed = seedContext ?? fallback[beatId]?.prompt ?? '';
  // The context the live model generates from. Seeded from this beat's real context, but
  // editable once live — typing your own words is the one thing recorded data can't do.
  const [context, setContext] = useState(seed);
  useEffect(() => { setContext(seed); }, [seed]); // reset the editable text when the beat changes

  // one-time capability probe (WebGPU + same-origin weights)
  useEffect(() => {
    let cancelled = false;
    detectCapability().then((c) => { if (!cancelled) setCapability(c); });
    return () => { cancelled = true; };
  }, []);

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
  // Progress goes through two phases: downloading the ~178MB weights, then a brief
  // WebGPU-compile gap before the model is ready.
  const loadLive = async () => {
    setMode('loading-live');
    setPhase('download');
    setProgress(0);
    try {
      const { LiveMicroscope } = await import('@/microscope/live');
      const m = await LiveMicroscope.create(MODEL_ID, (p) => {
        setProgress(p);
        if (p >= 99) setPhase('compile'); // download done; WebGPU is compiling shaders
      });
      liveRef.current = m;
      setSteps(await m.generateSteps(context, 8, temperature));
      setMode('live');
    } catch {
      setMode('live-failed'); // stay on the recorded steps
    }
  };

  // Re-run the live model from the (possibly edited) context at the current temperature.
  // No-op unless the live model is loaded — the temperature slider already reshapes the
  // displayed bars on its own (pure math), so this is only for regenerating the path / a
  // freshly-typed context.
  const resample = async () => {
    if (liveRef.current) setSteps(await liveRef.current.generateSteps(context, 8, temperature));
  };

  return { mode, steps, progress, phase, temperature, setTemperature, context, setContext, capability, loadLive, resample };
}
