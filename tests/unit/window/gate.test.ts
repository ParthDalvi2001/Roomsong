/// <reference types="webxr" />
// The garden window's mode gate (FR-SYS-07, LLD §11), and that the boot may import it (API_SPEC §1.10 rule 1).
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../src/core/index.js';
import { shouldOpenWindow } from '../../../src/window/index.js';

afterEach(() => vi.restoreAllMocks());

/** navigator.xr with its one answer; `ask` is its isSessionSupported. */
const xr = (answer: Promise<boolean>) => {
  const ask = vi.fn(() => answer);
  return { system: { isSessionSupported: ask } as unknown as XRSystem, ask };
};

describe('shouldOpenWindow: the mode gate (LLD §11)', () => {
  it('opens with the window flag, without asking the browser', async () => {
    const { system, ask } = xr(Promise.resolve(true));
    expect(await shouldOpenWindow(true, system)).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it('opens when the browser has no WebXR or no immersive-ar', async () => {
    expect(await shouldOpenWindow(false, undefined)).toBe(true);
    expect(await shouldOpenWindow(false, xr(Promise.resolve(false)).system)).toBe(true);
  });

  it('opens when the browser cannot say, and logs the reason', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    const reason = new Error('SecurityError');
    expect(await shouldOpenWindow(false, xr(Promise.reject(reason)).system)).toBe(true);
    expect(warn).toHaveBeenCalledWith('window', expect.any(String), reason);
  });

  it('stays shut when immersive-ar is supported: the XR path', async () => {
    const { system, ask } = xr(Promise.resolve(true));
    expect(await shouldOpenWindow(false, system)).toBe(false);
    expect(ask).toHaveBeenCalledWith('immersive-ar');
  });

  it("imports core's index alone, so the boot may take it without loading three", () => {
    const source = readFileSync(new URL('../../../src/window/gate.ts', import.meta.url), 'utf8');
    const imports = Array.from(source.matchAll(/\bfrom\s*'([^']+)'/g), (m) => m[1]);
    expect(imports).toEqual(['../core/index.js']);
  });
});
