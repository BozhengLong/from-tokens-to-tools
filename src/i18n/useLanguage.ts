import { useAppStore } from '@/state/store';
import { STRINGS, type StringKey } from './strings';

export function useLanguage() {
  const lang = useAppStore((s) => s.lang);
  const t = (key: StringKey): string => STRINGS[lang][key];
  return { lang, t };
}
