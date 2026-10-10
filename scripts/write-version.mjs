#!/usr/bin/env node
// Build stamp (T-108): writes dist/version.json = { version, commit, builtAt }. Run after `npm run build`;
// .github/workflows/deploy.yml does. The same `commit` and `builtAt` at two addresses prove that the Pages link
// and the mirror serve the same build.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIST = ROOT + 'dist/';

function fail(message) {
  console.error(`write-version: FAIL. ${message}`);
  process.exit(1);
}

if (!existsSync(DIST + 'index.html')) fail('no dist/index.html: run `npm run build` first');
const { version } = JSON.parse(readFileSync(ROOT + 'package.json', 'utf8'));
// The commit that is checked out, asked from git itself: the same answer on a laptop and on a CI runner.
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(commit)) fail(`git did not return a commit hash: ${commit}`);

const stamp = { version, commit, builtAt: new Date().toISOString() };
writeFileSync(DIST + 'version.json', JSON.stringify(stamp, null, 2) + '\n');
console.log(`write-version: dist/version.json ${JSON.stringify(stamp)}`);
