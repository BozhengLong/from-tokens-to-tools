import downloads from '../../scripts/record/manifests/downloads-bigfiles.yaml';
import weather from '../../scripts/record/manifests/shanghai-weather.yaml';
import wiki from '../../scripts/record/manifests/wikipedia-tweet.yaml';
import hn from '../../scripts/record/manifests/hn-weekend-pick.yaml';

// YAML manifests carry tool *names*; the UI doesn't need full ToolSpec, so we
// coerce the raw manifest into a partial Example shape for display purposes.
type RawManifest = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: string[];
  finalActionTools: string[];
  systemPromptExtras?: { zh: string; en: string };
  sandboxFixture?: string;
};

const RAW: RawManifest[] = [downloads, weather, wiki, hn] as RawManifest[];

export type ExampleMeta = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  toolNames: string[];
  finalActionTools: string[];
  sandboxFixture?: string;
};

export const EXAMPLES: ExampleMeta[] = RAW.map((r) => ({
  id: r.id,
  name: r.name,
  taskPrompt: r.taskPrompt,
  toolNames: r.tools,
  finalActionTools: r.finalActionTools,
  sandboxFixture: r.sandboxFixture,
}));

export const DEFAULT_EXAMPLE_ID = 'downloads-bigfiles';

export function getExample(id: string): ExampleMeta {
  const found = EXAMPLES.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown example: ${id}`);
  return found;
}

// Defensive check (YAML is hand-authored). Asserts the subset the UI relies on.
export function assertExamplesValid(): void {
  for (const r of RAW) {
    if (!r.id || !r.name?.zh || !r.name?.en || !r.taskPrompt?.zh) {
      throw new Error(`Malformed manifest: ${JSON.stringify(r).slice(0, 80)}`);
    }
  }
}

// Fail fast at module load if a hand-authored manifest is malformed.
assertExamplesValid();
