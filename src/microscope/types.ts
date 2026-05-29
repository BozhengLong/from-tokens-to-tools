import type { TokenProb } from './dist';

export type TokenizedPiece = { text: string; id: number };

// One generation step exposed to the UI: the distribution + which token was taken.
export type MicroscopeStep = { chosen: TokenProb; topK: TokenProb[] };

export interface TokenMicroscope {
  // split text into tokens with ids (for the "AI reads numbers" view)
  tokenize(text: string): Promise<TokenizedPiece[]>;
  // the next-token distribution given a context (top-k)
  nextTokenTopK(context: string, k: number): Promise<TokenProb[]>;
  // generate n steps from context, recording the distribution at each (for replay/scrub)
  generateSteps(context: string, n: number, temperature: number): Promise<MicroscopeStep[]>;
  readonly kind: 'live' | 'recorded';
}
