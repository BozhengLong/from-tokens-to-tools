import { describe, it, expect } from 'vitest';
import { STRINGS } from './strings';

describe('STRINGS', () => {
  it('zh and en have identical key sets', () => {
    const zhKeys = Object.keys(STRINGS.zh).sort();
    const enKeys = Object.keys(STRINGS.en).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('no empty values', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const [k, v] of Object.entries(STRINGS[lang])) {
        expect(v, `${lang}.${k}`).toBeTruthy();
      }
    }
  });
});
