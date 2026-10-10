#!/usr/bin/env node
// Placeholder until hosting is chosen (ENVIRONMENT_SETUP §7, T-108). Exits non-zero on purpose.
const target = process.argv[2] ?? 'staging';
console.error(`deploy:${target}: hosting not chosen yet (T-108)`);
process.exit(1);
