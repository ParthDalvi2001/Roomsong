import { describe, expect, it } from 'vitest';

import { DEFAULT_FLAGS, parseFlags } from '../../../src/core/flags.js';

const ALL =
  '?flags=perfHud,fovGuide,eventLog,noAnchors,noPlanes,noMeshes,forceLevel=3,fakeDay=+2,seed=42,autoplant=80,' +
  'skipOnboarding,forceSignature=wanderer,pinchTest,capSpike,window,timeLapse,handCue';

describe('core/flags', () => {
  it('has every flag off by default in a dev build', () => {
    expect(parseFlags('', true)).toEqual({ ...DEFAULT_FLAGS, dev: true });
    expect(DEFAULT_FLAGS).toMatchObject({
      forceLevel: null,
      fakeDay: 0,
      seed: null,
      autoplant: 0,
      window: false,
      timeLapse: false,
    });
  });

  it('parses every flag of API_SPEC §3 in a dev build', () => {
    expect(parseFlags(ALL, true)).toEqual({
      dev: true,
      perfHud: true,
      fovGuide: true,
      eventLog: true,
      noAnchors: true,
      noPlanes: true,
      noMeshes: true,
      forceLevel: 3,
      fakeDay: 2,
      seed: 42,
      autoplant: 80,
      skipOnboarding: true,
      forceSignature: 'wanderer',
      pinchTest: true,
      capSpike: true,
      window: true,
      timeLapse: true,
      handCue: true,
    });
    expect(parseFlags('?flags=fakeDay=-3', true).fakeDay).toBe(-3);
    expect(parseFlags('?flags=fakeDay=%2B1', true).fakeDay).toBe(1);
    // toBe is Object.is: a `-0` in the URL is 0, not -0.
    expect(parseFlags('?flags=fakeDay=-0,seed=-0,autoplant=-0', true)).toMatchObject({ fakeDay: 0, seed: 0 });
    expect(parseFlags('?flags=fakeDay=-0', true).fakeDay).toBe(0);
  });

  it('is inert in a production build: the defaults themselves, whatever the URL says', () => {
    expect(parseFlags(ALL, false)).toBe(DEFAULT_FLAGS);
    expect(parseFlags(ALL + '&dev=0', false)).toBe(DEFAULT_FLAGS);
    expect(parseFlags(ALL + '&dev=true', false)).toBe(DEFAULT_FLAGS);
    expect(parseFlags('?flags=dev=1,perfHud', false)).toBe(DEFAULT_FLAGS);
    expect(Object.isFrozen(DEFAULT_FLAGS)).toBe(true);
  });

  it('reads flags in a production build when dev=1 is present', () => {
    const flags = parseFlags('?dev=1&flags=perfHud,forceLevel=4', false);
    expect(flags).toMatchObject({ dev: true, perfHud: true, forceLevel: 4, fovGuide: false });
    expect(Object.isFrozen(flags)).toBe(true);
  });

  it('ignores unknown names and malformed values without throwing', () => {
    const garbage = [
      '?flags=forceLevel=0,fakeDay=tomorrow,seed=-1,autoplant=81,forceSignature=cathedral,nope,=,,=3,perfHud=yes',
      '?flags=forceLevel=5,fakeDay=1e9,seed=4294967296,autoplant=2.5,forceLevel,seed=0x10,fakeDay=99999999999999999999',
      '?flags=%E0%A4%A&flags=%&flags=%00,__proto__=1,constructor,toString=1',
      '?flags=' + 'forceLevel='.repeat(5000) + '&flags=' + '9'.repeat(100_000),
      '?' + 'x'.repeat(200_000),
      '???&&&===',
    ];
    for (const search of garbage) expect(parseFlags(search, true)).toEqual({ ...DEFAULT_FLAGS, dev: true });
  });

  it('adds up repeated keys; a later valid value wins and a malformed one changes nothing', () => {
    const flags = parseFlags(
      '?flags=perfHud,forceLevel=2&flags=forceLevel=3,forceLevel=x,perfHud=0,window=1',
      true,
    );
    expect(flags).toMatchObject({ forceLevel: 3, perfHud: false, window: true });
  });
});
