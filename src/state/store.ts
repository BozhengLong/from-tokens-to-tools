import { create } from 'zustand';

export type Lang = 'zh' | 'en';

type AppState = {
  exampleId: string;
  lang: Lang;
  setExample: (id: string) => void;
  setLang: (lang: Lang) => void;
};

const LANG_KEY = 'ftt-lang';

function readLang(): Lang | null {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : null;
    }
  } catch {
    // localStorage may be unavailable (SSR / restricted env)
  }
  return null;
}

function writeLang(lang: Lang): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(LANG_KEY, lang);
    }
  } catch {
    // ignore persistence failures
  }
}

const initialLang: Lang = readLang() ?? 'zh';

export const useAppStore = create<AppState>((set) => ({
  exampleId: 'downloads-bigfiles',
  lang: initialLang,
  setExample: (id) => set({ exampleId: id }),
  setLang: (lang) => {
    writeLang(lang);
    set({ lang });
  },
}));
