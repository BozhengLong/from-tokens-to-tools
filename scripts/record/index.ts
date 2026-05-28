// scripts/record/index.ts
import 'dotenv/config';
import { runTokenize } from './tokenize.js';
import { runLogits } from './logits.js';
import { runSampling } from './sampling.js';
import { runFunctionCalls } from './function-calls.js';
import { runAgentLoops } from './agent-loops.js';

const ALL_EXAMPLES = ['downloads-bigfiles', 'shanghai-weather', 'wikipedia-tweet', 'hn-weekend-pick'];
const LANGS = ['zh', 'en'] as const;
type Lang = (typeof LANGS)[number];

const parseArgs = (): { example: string; langs: Lang[] } => {
  const args = process.argv.slice(2);
  let example: string = 'all';
  let langs: Lang[] = [...LANGS];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example') {
      const v = args[++i];
      if (!v) throw new Error('--example requires a value');
      example = v;
    }
    if (args[i] === '--lang') {
      const v = args[++i];
      if (v !== 'zh' && v !== 'en') throw new Error('--lang must be zh or en');
      langs = [v];
    }
  }
  return { example, langs };
};

async function recordOne(exampleId: string, lang: Lang): Promise<void> {
  console.log(`\n=== ${exampleId} / ${lang} ===`);
  await runTokenize(exampleId, lang);
  await runLogits(exampleId, lang);
  await runSampling(exampleId, lang);
  await runFunctionCalls(exampleId, lang);
  await runAgentLoops(exampleId, lang);
}

(async () => {
  const { example, langs } = parseArgs();
  const examples = example === 'all' ? ALL_EXAMPLES : [example];
  for (const ex of examples) {
    for (const lang of langs) {
      await recordOne(ex, lang);
    }
  }
  console.log('\nAll recording complete.');
})().catch((e) => {
  console.error('Recording failed:', e);
  process.exit(1);
});
