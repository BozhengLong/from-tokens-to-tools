import {
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, TopologyDataSchema,
  type TokenizeData, type LogitsData, type SamplingData,
  type FunctionCallData, type TopologyData,
} from '@/types/schemas';
import type { Lang } from '@/state/store';

export type StationFile = 'tokenize' | 'logits' | 'sampling' | 'function-calls' | 'topology';

export type StationReturn = {
  tokenize: TokenizeData;
  logits: LogitsData;
  sampling: SamplingData;
  'function-calls': FunctionCallData;
  topology: TopologyData;
};

const SCHEMAS = {
  tokenize: TokenizeDataSchema,
  logits: LogitsDataSchema,
  sampling: SamplingDataSchema,
  'function-calls': FunctionCallDataSchema,
  topology: TopologyDataSchema,
} as const;

// Vite needs a static glob to know which JSON to bundle/split.
const MODULES = import.meta.glob('../data/examples/*/*.json');

export async function loadStation<K extends StationFile>(
  exampleId: string,
  station: K,
  lang: Lang
): Promise<StationReturn[K]> {
  const path = `../data/examples/${exampleId}/${station}.${lang}.json`;
  const loader = MODULES[path];
  if (!loader) throw new Error(`No recorded data at ${path}`);
  const mod = (await loader()) as { default: unknown };
  const schema = SCHEMAS[station];
  return schema.parse(mod.default) as StationReturn[K];
}
