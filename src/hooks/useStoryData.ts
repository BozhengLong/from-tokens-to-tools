import { useEffect, useState } from 'react';
import { StoryRunSchema, TokenFallbackSchema, type StoryRun, type TokenFallback } from '@/types/v2-schemas';

type Result =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; story: StoryRun; tokenFallback: TokenFallback };

// Static globs so Vite bundles/splits the JSON per scenario.
const STORIES = import.meta.glob('../data/v2/*/story.json');
const FALLBACKS = import.meta.glob('../data/v2/*/token-fallback.json');

export function useStoryData(exampleId: string) {
  const [state, setState] = useState<Result>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      try {
        const storyLoader = STORIES[`../data/v2/${exampleId}/story.json`];
        if (!storyLoader) throw new Error(`no story.json for ${exampleId}`);
        const story = StoryRunSchema.parse(((await storyLoader()) as { default: unknown }).default);
        const fbLoader = FALLBACKS[`../data/v2/${exampleId}/token-fallback.json`];
        const tokenFallback = fbLoader
          ? TokenFallbackSchema.parse(((await fbLoader()) as { default: unknown }).default)
          : {};
        if (!cancelled) setState({ status: 'ready', story, tokenFallback });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [exampleId]);
  return state;
}
