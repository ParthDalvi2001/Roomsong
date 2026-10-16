// The events onboarding/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// A consumer names a payload as EventMap['onboarding:step'], EventMap from core/.
import type { OnboardingStep } from './Onboarding.js';

declare module '../core/index.js' {
  interface EventMap {
    /** The tutorial took a step (UX §3.3); once per change, `off` again at the session's end. ui/Hints draws it. */
    'onboarding:step': { step: OnboardingStep };
  }
}
