import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import { writeFileSync, mkdirSync } from 'node:fs';
import { topKFromLogits, sampleIndex } from '../../src/microscope/dist.js';
import { softmaxFromLogprobs } from '../../src/utils/sampling.js';

const MODEL = process.env.V2_MODEL ?? 'HuggingFaceTB/SmolLM2-135M-Instruct';

// (beatId -> the real seed context for that "model speaks" beat). Filled from the
// curated StoryRun's zoom.seedContext. Edit these to match the captured story.
// Seeds end mid-phrase (e.g. "… npm", "… Math.") so the model completes a real,
// on-topic continuation rather than emitting newlines. Keep these IDENTICAL to the
// matching beat's zoom.seedContext in story.json.
const BEATS: Record<string, string> = {
  b1: "I'm fixing a failing test. First I'll run the test suite. The shell command is: npm",
  b3: 'The test failed because applyDiscount can return a negative price. To clamp it at zero in JavaScript, the fixed line uses Math.',
};

async function main() {
  // node CAN reach hf-mirror (HF is blocked in CN). Reuse the prefetch cache so we
  // don't re-download what scripts/v2/prefetch-model.ts already fetched.
  env.remoteHost = 'https://hf-mirror.com';
  env.allowRemoteModels = true;
  env.cacheDir = new URL('./models', import.meta.url).pathname; // scripts/v2/models
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL, { dtype: 'q4' });

  const out: Record<string, unknown> = {};
  for (const [beatId, prompt] of Object.entries(BEATS)) {
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
  mkdirSync('src/data/v2/fix-failing-test', { recursive: true });
  writeFileSync('src/data/v2/fix-failing-test/token-fallback.json', JSON.stringify(out, null, 2));
  console.log('wrote token-fallback.json');
}
main();
