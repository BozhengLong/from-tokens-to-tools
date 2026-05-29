// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStoryData } from './useStoryData';

describe('useStoryData', () => {
  it('loads + validates the hero story and its token fallback', async () => {
    const { result } = renderHook(() => useStoryData('fix-failing-test'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.story.beats.length).toBe(8);
      expect(result.current.tokenFallback.b1).toBeTruthy();
      expect(result.current.story.beats[0]!.kind).toBe('user');
    }
  });
});
