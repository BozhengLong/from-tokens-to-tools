import { describe, it, expect } from 'vitest';
import { byteToCharRange } from './byteToCharRange';

describe('byteToCharRange', () => {
  it('maps ascii byte range to identical char range', () => {
    expect(byteToCharRange('hello', [0, 2])).toEqual([0, 2]);
  });

  it('maps a multi-byte CJK range to char indices', () => {
    // "列出" — each char is 3 UTF-8 bytes
    const s = '列出 Downloads';
    expect(byteToCharRange(s, [0, 3])).toEqual([0, 1]);   // 列
    expect(byteToCharRange(s, [3, 6])).toEqual([1, 2]);   // 出
  });

  it('clamps out-of-range byte offsets', () => {
    expect(byteToCharRange('hi', [0, 999])).toEqual([0, 2]);
  });
});
