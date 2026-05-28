// scripts/record/manifest-loader.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ExampleSchema, type Example } from '../../src/types/schemas.js';
import { ALL_TOOLS } from '../../src/tools/index.js';
import { PATHS } from './config.js';

export type ManifestRaw = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: string[];                  // names only in YAML
  finalActionTools: string[];
  systemPromptExtras?: { zh: string; en: string };
  sandboxFixture?: string;
};

export const loadManifest = (exampleId: string): Example => {
  const filePath = path.resolve(PATHS.manifestsDir, `${exampleId}.yaml`);
  const raw = yaml.load(readFileSync(filePath, 'utf-8')) as ManifestRaw;
  // expand tool names → full ToolSpec by looking up in ALL_TOOLS
  const tools = raw.tools.map((name) => {
    const tool = ALL_TOOLS[name];
    if (!tool) throw new Error(`Unknown tool in manifest: ${name}`);
    return {
      name,
      description: { zh: name, en: name },   // descriptions to be filled by Plan B i18n
      parameters: tool.schema,
    };
  });
  const expanded = { ...raw, tools };
  return ExampleSchema.parse(expanded);
};
