// The real entry point. (The README mistakenly tells you to run `node run.js`,
// which does not exist — that wrong command is the recovery trap for the demo.)
const { readFileSync } = require('node:fs');
const path = require('node:path');

const cfg = JSON.parse(readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const total = cfg.items.reduce((sum, it) => sum + it.qty * it.price, 0);
console.log(`Processed ${cfg.items.length} items for "${cfg.project}". Order total: $${total.toFixed(2)}.`);
