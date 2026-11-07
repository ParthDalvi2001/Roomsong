// The headset recorder's snapshots of the drawn view (tests/tools/headset-recorder.ts, dev server only): with ?rec=1
// and a session, the left eye's view reaches the Mac as a PNG in .tmp/headset/snaps/ with a `snap` line in
// rec.jsonl. Emulator only: the snapshot is drawn the same way on a headset, but the readback there is untested.
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { enterXR, openApp, readRoom } from './support/iwer';

const REC_DIR = fileURLToPath(new URL('../../.tmp/headset/', import.meta.url));
const REC_FILE = `${REC_DIR}rec.jsonl`;
/** room:tuned comes 4 s after the bed lands (RIPPLE_TUNED_MS); software rendering is slow. */
const TUNED_SNAP_MS = 30_000;

type Snap = { kind: string; data: { file: string; why: string; multiview: boolean } };

test('the recorder saves a PNG of the left eye with the bed in it once the room has tuned (emulator)', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const offset = existsSync(REC_FILE) ? statSync(REC_FILE).size : 0;
  const snaps = (): Snap['data'][] =>
    readFileSync(REC_FILE)
      .subarray(offset)
      .toString()
      .split('\n')
      .filter((line) => line.includes('"kind":"snap"'))
      .map((line) => (JSON.parse(line) as Snap).data);
  try {
    await openApp(page, readRoom('table'), '/?rec=1');
    await enterXR(page);
    await expect
      .poll(() => snaps().some(({ why }) => why === 'room:tuned'), { timeout: TUNED_SNAP_MS })
      .toBe(true);
    const tuned = snaps().find(({ why }) => why === 'room:tuned')!;
    const png = readFileSync(`${REC_DIR}${tuned.file}`);
    writeFileSync(testInfo.outputPath('snapshot.png'), png); // a copy to look at: the recorder's own is removed
    const size = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }; // the IHDR chunk
    const eye = await page.evaluate(() => {
      const viewport = window.__roomsong!.world.renderer.xr.getCamera().cameras[0].viewport;
      return { width: viewport.z, height: viewport.w };
    });
    expect(Math.max(size.width, size.height)).toBe(512);
    expect(size.width / size.height).toBeCloseTo(eye.width / eye.height, 2);
    // Decoded by the page's own browser: the share of pixels that are not the passthrough grey.
    const drawn = await page.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.max(...[0, 1, 2].map((c) => Math.abs(data[i + c]! - 128))) > 12) count++;
      }
      return count / (data.length / 4);
    }, png.toString('base64'));
    console.log(`snapshot ${tuned.file}: ${size.width}x${size.height}, ${(drawn * 100).toFixed(1)}% drawn`);
    expect(drawn).toBeGreaterThan(0.005);
  } finally {
    if (existsSync(REC_FILE)) for (const { file } of snaps()) unlinkSync(`${REC_DIR}${file}`);
  }
});
