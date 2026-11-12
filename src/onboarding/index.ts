// Public API of the `onboarding` module (HLD §3, LLD §1). Other modules import from here only, never from files
// inside the folder (CODING_GUIDELINES §3).
export { Onboarding } from './Onboarding.js';
export type { GateGesture, OnboardingStep } from './Onboarding.js';
export { OnboardingSystem } from './OnboardingSystem.js';
export { LISTEN_AFTER_MS, ONBOARD_CAPTION_MS } from './config.js';
