import type { TokenMicroscope, MicroscopeStep, TokenizedPiece } from './types';
import type { TokenFallback } from '@/types/v2-schemas';

// Replays pre-recorded token data for one beat. Used when WebGPU/live is unavailable.
// `context`/`temperature` are ignored (it's a recording) — the UI still shows the real
// distribution; only live re-sampling is unavailable in this mode.
export class RecordedMicroscope implements TokenMicroscope {
  readonly kind = 'recorded' as const;
  private readonly entry: TokenFallback[string];

  constructor(data: TokenFallback, beatId: string) {
    const entry = data[beatId];
    if (!entry) throw new Error(`No recorded token data for beat ${beatId}`);
    this.entry = entry;
  }

  async tokenize(_text: string): Promise<TokenizedPiece[]> {
    // recorded mode can't tokenize arbitrary input; expose the recorded prompt's pieces
    return this.entry.steps.map((s, i) => ({ text: s.chosen, id: i }));
  }

  async nextTokenTopK(_context: string, k: number) {
    return this.entry.steps[0]!.topK.slice(0, k);
  }

  async generateSteps(_context: string, n: number, _temperature: number): Promise<MicroscopeStep[]> {
    return this.entry.steps.slice(0, n).map((s) => ({
      chosen: s.topK.find((t) => t.token === s.chosen) ?? s.topK[0]!,
      topK: s.topK,
    }));
  }
}
