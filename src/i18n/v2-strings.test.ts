import { describe, it, expect } from 'vitest';
import { V2_STRINGS } from './v2-strings';

describe('V2_STRINGS', () => {
  it('zh and en have identical keys', () => {
    expect(Object.keys(V2_STRINGS.zh).sort()).toEqual(Object.keys(V2_STRINGS.en).sort());
  });
  it('no empty values', () => {
    for (const lang of ['zh', 'en'] as const)
      for (const [k, v] of Object.entries(V2_STRINGS[lang])) expect(v, `${lang}.${k}`).toBeTruthy();
  });
});
