// scripts/record/validate.ts
// Validates recorded example JSON against the Zod schemas. Run:
//   npx tsx scripts/record/validate.ts <exampleDir>
//   npx tsx scripts/record/validate.ts            (validates all examples)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  TokenizeDataSchema, LogitsDataSchema, SamplingDataSchema,
  FunctionCallDataSchema, TopologyDataSchema,
} from '../../src/types/schemas.js';
import { PATHS } from './config.js';

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  tokenize: TokenizeDataSchema,
  logits: LogitsDataSchema,
  sampling: SamplingDataSchema,
  'function-calls': FunctionCallDataSchema,
  topology: TopologyDataSchema,
};

function validateDir(exampleDir: string): { ok: number; bad: number } {
  let ok = 0, bad = 0;
  const files = readdirSync(exampleDir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const base = f.split('.')[0] ?? '';
    const schema = SCHEMAS[base];
    if (!schema) { console.warn(`  ?? no schema for ${f}, skipping`); continue; }
    try {
      schema.parse(JSON.parse(readFileSync(path.join(exampleDir, f), 'utf-8')));
      console.log(`  OK  ${f}`);
      ok++;
    } catch (e) {
      console.error(`  BAD ${f}: ${(e as Error).message.slice(0, 300)}`);
      bad++;
    }
  }
  return { ok, bad };
}

const arg = process.argv[2];
const dirs = arg
  ? [arg]
  : readdirSync(PATHS.examplesDir)
      .map((d) => path.join(PATHS.examplesDir, d))
      .filter((d) => existsSync(d) && readdirSync(d).some((f) => f.endsWith('.json')));

let totalOk = 0, totalBad = 0;
for (const dir of dirs) {
  console.log(`--- ${dir} ---`);
  const { ok, bad } = validateDir(dir);
  totalOk += ok; totalBad += bad;
}
console.log(`\nValidation summary: ${totalOk} OK, ${totalBad} bad`);
process.exit(totalBad > 0 ? 1 : 0);
