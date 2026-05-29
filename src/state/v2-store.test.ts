import { describe, it, expect, beforeEach } from 'vitest';
import { useV2Store } from './v2-store';

describe('useV2Store', () => {
  beforeEach(() => useV2Store.setState({ exampleId: 'fix-failing-test', lang: 'zh', panIndex: 0, zoomDepth: 0, hasDescended: false }));

  it('next advances panIndex and resets zoomDepth', () => {
    useV2Store.getState().zoomIn(3);
    useV2Store.getState().next(8);
    const s = useV2Store.getState();
    expect(s.panIndex).toBe(1);
    expect(s.zoomDepth).toBe(0);
  });

  it('next is clamped at beatCount-1', () => {
    useV2Store.setState({ panIndex: 7 });
    useV2Store.getState().next(8);
    expect(useV2Store.getState().panIndex).toBe(7);
  });

  it('back decrements and clamps at 0; resets zoomDepth', () => {
    useV2Store.setState({ panIndex: 0, zoomDepth: 2 });
    useV2Store.getState().back();
    expect(useV2Store.getState().panIndex).toBe(0);
    expect(useV2Store.getState().zoomDepth).toBe(0);
  });

  it('zoomIn increments up to maxDepth and sets hasDescended', () => {
    useV2Store.getState().zoomIn(2);
    expect(useV2Store.getState().zoomDepth).toBe(1);
    expect(useV2Store.getState().hasDescended).toBe(true);
    useV2Store.getState().zoomIn(2);
    useV2Store.getState().zoomIn(2); // clamp
    expect(useV2Store.getState().zoomDepth).toBe(2);
  });

  it('zoomOut decrements, clamped at 0', () => {
    useV2Store.setState({ zoomDepth: 1 });
    useV2Store.getState().zoomOut();
    expect(useV2Store.getState().zoomDepth).toBe(0);
    useV2Store.getState().zoomOut();
    expect(useV2Store.getState().zoomDepth).toBe(0);
  });
});
