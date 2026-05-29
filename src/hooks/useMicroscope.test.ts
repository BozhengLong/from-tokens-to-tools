// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMicroscope } from './useMicroscope';
import type { TokenFallback } from '@/types/v2-schemas';

const fb: TokenFallback = {
  b1: { model: 'm', prompt: 'p', steps: [{ chosen: 'x', topK: [{ token: 'x', id: 1, logprob: -0.5 }] }] },
};

describe('useMicroscope (recorded default)', () => {
  it('exposes recorded steps for a beat without loading any model', async () => {
    const { result } = renderHook(() => useMicroscope(fb, 'b1'));
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    expect(result.current.mode).toBe('recorded');
    expect(result.current.steps[0]!.topK[0]!.token).toBe('x');
  });
});
