// Download a transformers.js model from hf-mirror into public/models, to be
// served SAME-ORIGIN to the browser later. Rationale (proven in the C1 pre-flight):
// browsers in CN cannot fetch huggingface.co (CORS + reachability), but node CAN
// reach hf-mirror.com. So we download once here and self-host the weights; the
// browser then loads them from our own origin with no CORS.
//
// Usage:
//   NODE_USE_ENV_PROXY=1 npx tsx scripts/v2/prefetch-model.ts
//   V2_MODEL=HuggingFaceTB/SmolLM2-135M-Instruct V2_DTYPE=q4 npx tsx scripts/v2/prefetch-model.ts
import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';

env.remoteHost = 'https://hf-mirror.com';
env.allowLocalModels = false;
env.allowRemoteModels = true;
// serve same-origin from /models in dev + prod (Vite serves public/ at the root)
env.cacheDir = new URL('../../public/models', import.meta.url).pathname; // public/models/<id>/...

const MODEL = process.env.V2_MODEL ?? 'HuggingFaceTB/SmolLM2-135M-Instruct';
const DTYPE = (process.env.V2_DTYPE ?? 'q4') as 'q4' | 'q8' | 'fp16' | 'fp32';

console.log(`downloading ${MODEL} (dtype=${DTYPE}) -> ${env.cacheDir}`);
await AutoTokenizer.from_pretrained(MODEL);
await AutoModelForCausalLM.from_pretrained(MODEL, { dtype: DTYPE });
console.log('done — model cached under public/models/<id>/ (gitignored; served same-origin at /models)');
