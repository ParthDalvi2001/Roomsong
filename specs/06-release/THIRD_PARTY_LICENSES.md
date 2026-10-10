# Third-Party Licenses & Asset Register — Roomsong

**Status:** Living · **Owner:** devops-engineer (packages) / ux-designer (assets)
Contest rule: Meta may request proof of licence for any material. Every external item is logged here **before** it is added. Runtime policy: original or CC0/OFL/MIT/BSD/Apache/ISC only. No brands, no identifiable people.

---

## 1. Runtime dependencies (shipped in the bundle)
| Package | Version | License | Purpose | Added by (task) |
|---|---|---|---|---|
| @iwsdk/* (Immersive Web SDK) | _tbd_ | MIT (verify in package.json) | WebXR framework | T-004 |
| three | _tbd_ | MIT | 3D rendering | T-004 |

## 2. Build/dev dependencies (not shipped)
| Package | License |
|---|---|
| vite, vitest, @playwright/test, typescript, eslint, prettier, @typescript-eslint/* | MIT / Apache-2.0 |

## 3. Assets
| Asset | Type | Source | License | Where used |
|---|---|---|---|---|
| All 3D plant/bed/vine geometry | procedural | entrant-built | original | render/ |
| All shaders | code | entrant-built | original | render/shaders |
| All sounds | synthesized | entrant-built | original (ADR-002) | audio/ |
| Gesture icons (palm, pinch, pull, drag, drag-off, palms-out, wake) | SVG | entrant-built | original | ui/ |
| Font (captions/panel) | _tbd: system font or an OFL font (e.g. Inter OFL-1.1)_ | | | ui/ |
| App icon / Devpost gallery images | captures of the app | entrant-built | original | submission |

## 4. Verification checklist (before submission)
- [ ] `npm ls --prod --json | node scripts/licenses.mjs` output matches §1
- [ ] No file in `public/` or `src/` originates from a third party without a row above
- [ ] Video contains only app footage, team VO, and app audio
