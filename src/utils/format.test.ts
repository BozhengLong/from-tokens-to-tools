import { describe, it, expect } from 'vitest';
import { formatBytes, formatPct } from './format';

describe('formatBytes', () => {
  it('formats GB', () => { expect(formatBytes(2_400_000_000)).toBe('2.4 GB'); });
  it('formats MB', () => { expect(formatBytes(89_000_000)).toBe('89.0 MB'); });
  it('formats small', () => { expect(formatBytes(2400)).toBe('2.4 KB'); });
});

describe('formatPct', () => {
  it('formats a probability as a percentage', () => { expect(formatPct(0.1234)).toBe('12.3%'); });
});
