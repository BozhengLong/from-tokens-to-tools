// scripts/record/tokenize.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { encoding_for_model, type TiktokenModel, type Tiktoken } from 'tiktoken';
import { loadManifest } from './manifest-loader.js';
import { PATHS, RECORDING_CONFIG } from './config.js';
import { TokenizeDataSchema, type TokenizeData } from '../../src/types/schemas.js';

// Pick the tokenizer matching the chat model so Station 1 reflects what the
// model that actually generated the recording sees. tiktoken's known-model
// list varies by version; fall back to gpt-4 (cl100k_base) if the chat model
// isn't recognized.
function encodingForChatModel(): { enc: Tiktoken; tokenizer: string } {
  const model = RECORDING_CONFIG.model;
  try {
    return { enc: encoding_for_model(model as TiktokenModel), tokenizer: model };
  } catch {
    return { enc: encoding_for_model('gpt-4'), tokenizer: 'cl100k_base (fallback)' };
  }
}

export async function runTokenize(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const prompt = manifest.taskPrompt[lang];

  const { enc, tokenizer } = encodingForChatModel();
  const tokenIds = enc.encode(prompt);

  const promptBytes = new TextEncoder().encode(prompt);
  const tokens: TokenizeData['tokens'] = [];
  let byteCursor = 0;
  for (const id of tokenIds) {
    const tokenBytes = enc.decode(new Uint32Array([id])); // returns Uint8Array
    const text = new TextDecoder('utf-8', { fatal: false }).decode(tokenBytes);
    tokens.push({
      id,
      text,
      byteRange: [byteCursor, byteCursor + tokenBytes.length],
    });
    byteCursor += tokenBytes.length;
  }
  enc.free();
  if (byteCursor !== promptBytes.length) {
    throw new Error(`Tokenize byte mismatch: ${byteCursor} vs ${promptBytes.length}`);
  }

  const data: TokenizeData = {
    _meta: {
      model: tokenizer,
      recordedAt: new Date().toISOString(),
      scriptVersion: 'tokenize.ts',
      lang,
    },
    prompt,
    tokens,
  };
  TokenizeDataSchema.parse(data);

  const outDir = path.resolve(PATHS.examplesDir, exampleId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `tokenize.${lang}.json`), JSON.stringify(data, null, 2));
  console.log(`[tokenize] wrote ${exampleId}/tokenize.${lang}.json (${tokens.length} tokens)`);
}
