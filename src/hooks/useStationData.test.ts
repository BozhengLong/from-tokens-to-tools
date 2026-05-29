// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStationData } from './useStationData';

describe('useStationData', () => {
  it('loads tokenize data for the current store example/lang', async () => {
    const { result } = renderHook(() => useStationData('tokenize'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.data.tokens.length).toBeGreaterThan(0);
    }
  });
});
