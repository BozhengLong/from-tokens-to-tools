// scripts/record/tokenize.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { encoding_for_model } from 'tiktoken';
import { loadManifest } from './manifest-loader.js';
import { PATHS } from './config.js';
import { TokenizeDataSchema, type TokenizeData } from '../../src/types/schemas.js';

export async function runTokenize(exampleId: string, lang: 'zh' | 'en'): Promise<void> {
  const manifest = loadManifest(exampleId);
  const prompt = manifest.taskPrompt[lang];

  const enc = encoding_for_model('gpt-4'); // cl100k_base
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
      model: 'cl100k_base',
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
