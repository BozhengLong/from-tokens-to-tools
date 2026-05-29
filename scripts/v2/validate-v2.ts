// Validate every v2 scenario's data against the Zod schemas, and check that each
// story's tokenFallbackRef resolves to a real key in token-fallback.json.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { StoryRunSchema, TokenFallbackSchema, type TokenFallback } from '../../src/types/v2-schemas.js';

const ROOT = 'src/data/v2';
let failures = 0;
const fail = (m: string) => { failures++; console.error('✗ ' + m); };

for (const scenario of readdirSync(ROOT)) {
  const dir = join(ROOT, scenario);
  const storyPath = join(dir, 'story.json');
  if (!existsSync(storyPath)) { fail(`${scenario}: missing story.json`); continue; }

  let story;
  try {
    story = StoryRunSchema.parse(JSON.parse(readFileSync(storyPath, 'utf8')));
    console.log('✓ ' + storyPath + ` (${story.beats.length} beats)`);
  } catch (e) { fail(`${storyPath}\n${String(e).slice(0, 600)}`); continue; }

  const tfPath = join(dir, 'token-fallback.json');
  let tf: TokenFallback = {};
  if (existsSync(tfPath)) {
    try { tf = TokenFallbackSchema.parse(JSON.parse(readFileSync(tfPath, 'utf8'))); console.log('✓ ' + tfPath); }
    catch (e) { fail(`${tfPath}\n${String(e).slice(0, 600)}`); }
  }

  for (const b of story.beats) {
    const ref = b.zoom?.tokenFallbackRef;
    if (!ref) continue;
    const key = ref.split('#')[1];
    if (!key || !(key in tf)) fail(`${scenario}: tokenFallbackRef "${ref}" (beat ${b.id}) has no matching key in token-fallback.json`);
  }
}

if (failures) { console.error(`\n${failures} validation failure(s)`); process.exit(1); }
console.log('\nall v2 data valid');
