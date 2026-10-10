#!/usr/bin/env node
// Download budget (T-109; FR-SYS-06, TC-PERF-05): the first load of index.html is at most 4 MB gzipped.
// Run after `npm run build`; `npm run verify` does.
// Counted: every file in dist/ except the other HTML pages and what only they name (the proto test pages). That
// includes lazy chunks and workers, so the number is an upper bound of the first load and moving code into
// another chunk cannot dodge it. A file is "named" by a page when its file name appears in the page or in a file
// that page names.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const ENTRY = 'index.html';
const BUDGET_BYTES = 4_000_000; // FR-SYS-06: 4 MB, decimal as in Vite's own size report
const KB = 1000;

const files = readdirSync(DIST, { recursive: true, encoding: 'utf8' }).filter((f) =>
  statSync(DIST + f).isFile(),
);
const assets = files.filter((f) => !f.endsWith('.html'));

function namedBy(page) {
  const reached = [page];
  for (const file of reached) {
    const text = readFileSync(DIST + file, 'latin1');
    for (const asset of assets)
      if (!reached.includes(asset) && text.includes(basename(asset))) reached.push(asset);
  }
  return new Set(reached);
}

const first = namedBy(ENTRY);
const otherPagesOnly = new Set(
  files.filter((f) => f.endsWith('.html') && f !== ENTRY).flatMap((page) => [...namedBy(page)]),
);
const counted = files.filter((f) => first.has(f) || (!f.endsWith('.html') && !otherPagesOnly.has(f)));

const kb = (bytes) => (bytes / KB).toFixed(1).padStart(10);
const row = (name, raw, gzip) =>
  console.log(`  ${name.padEnd(Math.max(...counted.map((f) => f.length)))}${raw}${gzip}`);
let total = 0;
console.log(`check-size: first load of ${ENTRY}, upper bound`);
row('file', 'raw kB'.padStart(10), 'gzip kB'.padStart(10));
for (const file of counted) {
  const raw = readFileSync(DIST + file);
  const gzip = gzipSync(raw).length;
  total += gzip;
  row(file, kb(raw.length), kb(gzip));
}
row('total', ''.padStart(10), `${kb(total)}  of ${BUDGET_BYTES / KB} kB`);

if (total > BUDGET_BYTES) {
  console.error(
    `check-size: FAIL. ${kb(total).trim()} kB gzip is over the ${BUDGET_BYTES / KB} kB budget (FR-SYS-06).`,
  );
  process.exit(1);
}
console.log('check-size: PASS');
