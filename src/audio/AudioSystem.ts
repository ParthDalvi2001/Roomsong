// The one audio file that loads core/ at run time: it makes the engine and wires it to the events core declares
// (API_SPEC §2). Not wired yet: room:bedPlaced, room:signature, garden:changed, garden:removed, garden:grown,
// listen:* and the per-frame listener pose. They need the bed entity and the frame loop and join here with the
// integration task (T-128).
import { bus, log, settings } from '../core/index.js';

import { Engine, type AudioEngine } from './AudioEngine.js';

import type { EventMap, Settings } from '../core/index.js';

/** The app's audio engine, following the user's settings and the session. Call it once; `init()` it in the Enter gesture. */
export function createAudioEngine(): AudioEngine {
  const engine = new Engine();

  const applySettings = (s: Readonly<Settings>): void => {
    engine.setTempo(s.tempo);
    engine.setVolume(s.volume);
    engine.setReverb(s.reverb);
  };
  applySettings(settings.get());
  bus.on('settings:changed', (payload) => applySettings(payload.settings));

  // Session start, session end, and the session or the page becoming visible or hidden: all three carry `visible`.
  // Resumed when seen (NFR-PERF-10), faded out and suspended when not (FR-SYS-05).
  const onVisibility = ({ visible }: EventMap['xr:visibility']): void => {
    (visible ? engine.resume() : engine.suspend()).catch((err: unknown) =>
      log.error('audio', 'E_AUDIO_CONTEXT', err),
    );
  };
  bus.on('xr:sessionStart', onVisibility);
  bus.on('xr:sessionEnd', onVisibility);
  bus.on('xr:visibility', onVisibility);

  return engine;
}
