// scripts/record/config.ts
export const RECORDING_CONFIG = {
  model: 'gpt-4o',
  seed: 42,                          // for reproducibility; sampling.ts overrides
  topLogprobs: 20,
  maxIterations: 10,                 // agent-loops cap
  observationTruncateChars: 2000,    // §6 rule #4
  reasoningTruncateChars: 500,
  // step selection heuristic thresholds (logits.ts)
  highEntropyNats: 1.5,
  topPairLogprobDeltaMax: 1.0,
} as const;

export const PATHS = {
  examplesDir: 'src/data/examples',
  sandboxesDir: 'src/data/sandboxes',
  manifestsDir: 'scripts/record/manifests',
} as const;
