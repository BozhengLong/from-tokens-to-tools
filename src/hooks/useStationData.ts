import { useEffect, useState } from 'react';
import { useAppStore } from '@/state/store';
import { loadStation, type StationFile, type StationReturn } from '@/examples/loadExampleData';

type Result<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

export function useStationData<K extends StationFile>(station: K) {
  const exampleId = useAppStore((s) => s.exampleId);
  const lang = useAppStore((s) => s.lang);
  const [state, setState] = useState<Result<StationReturn[K]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadStation(exampleId, station, lang)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch((e) => { if (!cancelled) setState({ status: 'error', error: String(e) }); });
    return () => { cancelled = true; };
  }, [exampleId, lang, station]);

  return state;
}
