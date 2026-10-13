#!/usr/bin/env node
// Bundle sweep (T-109; NFR-SEC-01, Golden Rule 9). Run after `npm run build`; `npm run verify` does.
// 1. Every remote URL string in any file under dist/ must be listed in check-dist.allowlist.json with the reason
//    it is never requested. A string this script has not seen before fails the check.
// 2. Every HTML page under dist/ must carry exactly EXPECTED_POLICY, the Content Security Policy that
//    vite.config.ts adds, and must hold no inline script, event handler or style element (the policy blocks them).
// 3. Licences (T-171, THIRD_PARTY_LICENSES.md): dist/LICENSES/ holds licence texts, and no file holds the code of
//    @drawcall/uikitml, which has no licence (vite.config.ts swaps it for build/stubs/uikitml.js).
// shortcut: a host joined from pieces inside SDK code shows only as its fixed head (down to a bare "https://"),
// upgrade if the policy ever allows a remote host; until then the browser blocks the request itself.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const ALLOWLIST = fileURLToPath(new URL('./check-dist.allowlist.json', import.meta.url));
// A remote URL starts with a scheme and "://", or is protocol-relative: "//host.tld" right after a quote, "(" or
// "=". It ends at white space, a quote, "<", ">", "\", ")" or a template hole "${".
const REMOTE_URL =
  /(?:\b(?:https?|wss?|ftp):\/\/|(?<=["'`(=])\/\/(?=[\w-]+\.[\w-]))(?:(?!\$\{)[^\s"'`<>\\)])*/gi;
const CSP_META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/;
// The one policy a built page may carry, character for character as vite.config.ts builds it. A change to the
// policy is made in both places, for a reason that tests/e2e/04-built-page-policy.spec.ts shows.
const EXPECTED_POLICY =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' data:; style-src-attr 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'";

const LICENSE_TEXT = /^LICENSES[/\\][^/\\]+\.txt$/; // a text the licenseTexts plugin in vite.config.ts writes
// shortcut: two messages of @drawcall/uikitml 0.1.8 (parse.js, css.js), re-read them if IWSDK pins another version.
const UNLICENSED_CODE = [
  'UIKitML requires exactly one root component.',
  'Expected a stylesheet selector before declaration block.',
];

const allowed = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
const files = readdirSync(DIST, { recursive: true, encoding: 'utf8' }).filter((f) =>
  statSync(DIST + f).isFile(),
);
const seen = new Map(); // url -> { count, files }
const failures = [];
let pages = 0;

for (const file of files) {
  const text = readFileSync(DIST + file, 'latin1'); // every file, binary ones too: URLs are ASCII
  // A licence text is plain text that no page loads: its URLs are never requested.
  for (const [url] of LICENSE_TEXT.test(file) ? [] : text.matchAll(REMOTE_URL)) {
    const entry = seen.get(url) ?? seen.set(url, { count: 0, files: new Set() }).get(url);
    entry.count += 1;
    entry.files.add(file);
  }
  for (const marker of UNLICENSED_CODE)
    if (text.includes(marker)) failures.push(`${file}: code of @drawcall/uikitml (no licence): "${marker}"`);
  if (!file.endsWith('.html')) continue;
  pages += 1;
  const policy = CSP_META.exec(text)?.[1].replaceAll('&#39;', "'"); // Vite writes ' as &#39;
  if (policy === undefined) failures.push(`${file}: no Content-Security-Policy meta tag`);
  else if (policy !== EXPECTED_POLICY) failures.push(`${file}: policy is not the expected one: ${policy}`);
  // What the policy blocks would be a dead or unstyled page on the headset, so say it at build time.
  if (/<script(?![^>]*\ssrc=)|\son[a-z]+="/i.test(text))
    failures.push(`${file}: inline script or event handler, which the policy blocks: move it into a module`);
  if (/<style[\s>]/i.test(text))
    failures.push(`${file}: inline <style> element, which the policy blocks: move it into a .css file`);
}
if (pages === 0) failures.push('no HTML page in dist/, so no policy was checked: run `npm run build` first');
const licenses = files.filter((f) => LICENSE_TEXT.test(f)).length;
if (licenses === 0)
  failures.push('no licence text in dist/LICENSES/: the licenseTexts plugin in vite.config.ts writes them');

console.log(
  `check-dist: ${files.length} files (${pages} HTML, ${licenses} licence texts), ${seen.size} distinct remote URL strings`,
);
for (const [url, { count, files: where }] of [...seen].sort()) {
  const reason = allowed[url];
  console.log(
    `  ${reason ? 'ok ' : 'NEW'}  ${String(count).padStart(5)}x  ${url}  (${reason ?? [...where].join(', ')})`,
  );
  if (!reason) failures.push(`remote URL string not on the allowlist: ${url}`);
}
for (const url of Object.keys(allowed)) {
  if (!seen.has(url)) failures.push(`allowlist entry is no longer in dist, remove it: ${url}`);
}

for (const failure of failures) console.error(`FAIL  ${failure}`);
if (failures.length > 0) {
  console.error('check-dist: FAIL. A URL: remove it, or only if nothing ever requests it add it with its');
  console.error('reason to scripts/check-dist.allowlist.json. A policy: vite.config.ts sets it and');
  console.error(`this script expects exactly: ${EXPECTED_POLICY}`);
  process.exit(1);
}
console.log('check-dist: PASS');
