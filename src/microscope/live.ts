import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import type { TokenMicroscope, MicroscopeStep, TokenizedPiece } from './types';
import { topKFromLogits, sampleIndex } from './dist';
import { softmaxFromLogprobs } from '@/utils/sampling';

// Lazily-constructed; call LiveMicroscope.create() (which loads weights from the HF CDN).
export class LiveMicroscope implements TokenMicroscope {
  readonly kind = 'live' as const;
  private tokenizer: any;
  private model: any;
  private constructor(tokenizer: any, model: any) {
    this.tokenizer = tokenizer;
    this.model = model;
  }

  static async create(modelId = 'HuggingFaceTB/SmolLM2-135M-Instruct', onProgress?: (p: number) => void): Promise<LiveMicroscope> {
    // Same-origin local weights (downloaded by scripts/v2/prefetch-model.ts, served at
    // /models). Browsers in CN can't reach HF, so we never load remotely.
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = '/models';
    const tokenizer = await AutoTokenizer.from_pretrained(modelId);
    const model = await AutoModelForCausalLM.from_pretrained(modelId, {
      device: 'webgpu', dtype: 'q4',
      progress_callback: (p: any) => onProgress?.(p?.progress ?? 0),
    });
    return new LiveMicroscope(tokenizer, model);
  }

  async tokenize(text: string): Promise<TokenizedPiece[]> {
    const enc = await this.tokenizer(text);
    const ids: number[] = Array.from(await enc.input_ids.tolist())[0] as number[];
    return ids.map((id) => ({ id, text: this.tokenizer.decode([id]) }));
  }

  private async logitsAt(context: string): Promise<number[]> {
    const inputs = await this.tokenizer(context);
    const output = await this.model(inputs);
    const logits = output.logits;               // dims [1, seq, vocab]
    const dims = logits.dims as number[];
    const seq = dims[dims.length - 2]!;
    const vocab = dims[dims.length - 1]!;
    // Read the last token's row from the flat buffer — slice().tolist() collapses
    // dims unpredictably in this transformers.js version (confirmed in the spike).
    const flat = logits.data as Float32Array;
    const start = (seq - 1) * vocab;
    return Array.from(flat.slice(start, start + vocab)) as number[];
  }

  async nextTokenTopK(context: string, k: number) {
    const logits = await this.logitsAt(context);
    return topKFromLogits(logits, k, (id) => this.tokenizer.decode([id]));
  }

  async generateSteps(context: string, n: number, temperature: number): Promise<MicroscopeStep[]> {
    const steps: MicroscopeStep[] = [];
    let ctx = context;
    for (let i = 0; i < n; i++) {
      const logits = await this.logitsAt(ctx);
      const topK = topKFromLogits(logits, 20, (id) => this.tokenizer.decode([id]));
      const probs = softmaxFromLogprobs(topK.map((t) => t.logprob));
      const pickLocal = sampleIndex(probs, temperature, () => Math.random());
      const chosen = topK[pickLocal]!;
      steps.push({ chosen, topK });
      ctx += chosen.token;
    }
    return steps;
  }
}
