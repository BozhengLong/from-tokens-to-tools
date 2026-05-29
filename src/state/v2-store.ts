import { create } from 'zustand';

export type Lang = 'zh' | 'en';

type V2State = {
  exampleId: string;
  lang: Lang;
  panIndex: number;   // which beat
  zoomDepth: number;  // 0 = macro card; 1..N = into beat.zoom.levels[0..N-1]
  hasDescended: boolean; // has the user zoomed at least once (guided first descent)
  next: (beatCount: number) => void;
  back: () => void;
  zoomIn: (maxDepth: number) => void;
  zoomOut: () => void;
  setLang: (lang: Lang) => void;
  setExample: (id: string) => void;
};

const LANG_KEY = 'ftt2-lang';
const readLang = (): Lang => {
  try { if (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY) === 'en') return 'en'; } catch { /* ignore */ }
  return 'zh';
};

export const useV2Store = create<V2State>((set) => ({
  exampleId: 'fix-failing-test',
  lang: readLang(),
  panIndex: 0,
  zoomDepth: 0,
  hasDescended: false,
  next: (beatCount) => set((s) => ({ panIndex: Math.min(s.panIndex + 1, beatCount - 1), zoomDepth: 0 })),
  back: () => set((s) => ({ panIndex: Math.max(s.panIndex - 1, 0), zoomDepth: 0 })),
  zoomIn: (maxDepth) => set((s) => ({ zoomDepth: Math.min(s.zoomDepth + 1, maxDepth), hasDescended: true })),
  zoomOut: () => set((s) => ({ zoomDepth: Math.max(s.zoomDepth - 1, 0) })),
  setLang: (lang) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ } set({ lang }); },
  setExample: (id) => set({ exampleId: id, panIndex: 0, zoomDepth: 0, hasDescended: false }),
}));
