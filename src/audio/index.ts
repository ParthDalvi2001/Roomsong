// Public API of the `audio` module (API_SPEC §1.2, LLD §1). Other modules import from here only, never from
// files inside the folder (CODING_GUIDELINES §3). Voice and VoiceParams are internal and stay inside.
export { VOICE_CAP } from './config.js';
export { createAudioEngine, GardenAudioSystem } from './AudioSystem.js';
export type { AudioEngine } from './AudioEngine.js';
