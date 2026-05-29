import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ exampleId: 'downloads-bigfiles', lang: 'zh' });
  });

  it('defaults: example=downloads-bigfiles, lang=zh', () => {
    const s = useAppStore.getState();
    expect(s.exampleId).toBe('downloads-bigfiles');
    expect(s.lang).toBe('zh');
  });

  it('setExample changes the example', () => {
    useAppStore.getState().setExample('shanghai-weather');
    expect(useAppStore.getState().exampleId).toBe('shanghai-weather');
  });

  it('setLang changes the language', () => {
    useAppStore.getState().setLang('en');
    expect(useAppStore.getState().lang).toBe('en');
  });
});
