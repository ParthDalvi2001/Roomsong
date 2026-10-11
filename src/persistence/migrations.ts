// Schema migrations (API_SPEC §4, FR-PER-02).
import { validateState } from './schema.js';

import type { GardenState } from '../garden/index.js';

/**
 * Brings a stored value up to the current schema and validates it. null: an unknown version, or corrupt data;
 * the caller keeps a backup and starts a new garden. Never throws.
 */
export function migrate(v: unknown): GardenState | null {
  // Version 1 is the only version there has been, so there is nothing to convert, and validateState refuses
  // every other version. A version 2 converts a version-1 value here, before the validation.
  return validateState(v);
}
