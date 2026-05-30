import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import { writeFileSync, mkdirSync } from 'node:fs';
import { topKFromLogits, sampleIndex } from '../../src/microscope/dist.js';
import { softmaxFromLogprobs } from '../../src/utils/sampling.js';

const MODEL = process.env.V2_MODEL ?? 'HuggingFaceTB/SmolLM2-135M-Instruct';

// Per-scenario (beatId -> the real seed context for that "model speaks" beat). Each
// seed is the matching beat's zoom.seedContext in that scenario's story.json — keep
// them IDENTICAL. Seeds end mid-phrase (e.g. "… npm", "… Math.", "… ls") so the model
// completes a real, on-topic continuation rather than emitting newlines.
const SCENARIOS: Record<string, Record<string, string>> = {
  'fix-failing-test': {
    b1: "I'm fixing a failing test. First I'll run the test suite. The shell command is: npm",
    b3: 'The test failed because applyDiscount can return a negative price. To clamp it at zero in JavaScript, the fixed line uses Math.',
  },
  'clean-big-files': {
    c1: "I'm cleaning up a folder full of large files. To list them with their sizes, the shell command is: ls",
  },
  'error-recovery': {
    e1: 'First I follow the README exactly. Its start command is: node',
    e5: 'To run it without touching tracked files, I copy index.js to a temp file and run it. The command is: cp',
  },
};

async function main() {
  // node CAN reach hf-mirror (HF is blocked in CN). Reuse the prefetch cache so we
  // don't re-download what scripts/v2/prefetch-model.ts already fetched.
  env.remoteHost = 'https://hf-mirror.com';
  env.allowRemoteModels = true;
  env.cacheDir = new URL('./models', import.meta.url).pathname; // scripts/v2/models
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL, { dtype: 'q4' });

  // Capture one scenario (V2_SCENARIO=...) or all of them (default).
  const only = process.env.V2_SCENARIO;
  const scenarios = only ? { [only]: SCENARIOS[only]! } : SCENARIOS;

  for (const [scenario, beats] of Object.entries(scenarios)) {
    const out: Record<string, unknown> = {};
    for (const [beatId, prompt] of Object.entries(beats)) {
      let ctx = prompt;
      const steps = [];
      for (let i = 0; i < 8; i++) {
        const inputs = await tokenizer(ctx);
        const output = await model(inputs);
        const logits = output.logits;
        const dims = logits.dims as number[];
        const seq = dims[dims.length - 2]!;
        const vocab = dims[dims.length - 1]!;
        const flat = logits.data as Float32Array;
        const row = Array.from(flat.slice((seq - 1) * vocab, seq * vocab)) as number[];
        const topK = topKFromLogits(row, 20, (id: number) => tokenizer.decode([id]));
        const probs = softmaxFromLogprobs(topK.map((t) => t.logprob));
        const chosenLocal = sampleIndex(probs, 0, () => 0); // greedy for a stable recording
        const chosen = topK[chosenLocal]!;
        steps.push({ chosen: chosen.token, topK });
        ctx += chosen.token;
      }
      out[beatId] = { model: MODEL, prompt, steps };
    }
    const dir = `src/data/v2/${scenario}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/token-fallback.json`, JSON.stringify(out, null, 2));
    console.log(`wrote ${dir}/token-fallback.json (${Object.keys(beats).length} beat(s))`);
  }
}
main();
