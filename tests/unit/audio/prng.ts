// Mulberry32, a tiny seeded generator, for tests that need repeatable jitter (CODING_GUIDELINES §9: no randomness
// without a seed). The audio code makes its noise with the same algorithm, written out in its two render loops
// (src/audio/Reverb.ts, src/audio/karplus.ts): a call per sample puts a number on the heap (T-143 review).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
