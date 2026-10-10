# Quest WebXR technical feasibility for Roomsong (IWSDK + Three.js + Web Audio in Meta Quest Browser), as of 2026-10-10

Scope: capability-by-capability feasibility of building Roomsong (hands-first MR music garden on a real table) as a WebXR `immersive-ar` app using Meta's Immersive Web SDK (IWSDK) + Three.js + Web Audio in Meta Quest Browser on Quest 3 / 3S, with the newly announced "Meta VR Glasses" as a secondary target, and with **no headset on the team** (emulator-first development).

Rating key used throughout: **CONFIRMED** = official doc/spec states it (version cited where available); **LIKELY** = community reports, secondary sources, or official docs that are stale/indirect; **NEEDS-POC** = unclear; a <1-hour PoC on a borrowed headset is proposed.

Method note: ~60 web fetches/searches against Meta Developer Center (developers.meta.com), iwsdk.dev (redirects to Meta docs; the old iwsdk.dev/guides/* paths now 404), GitHub (facebook/immersive-web-sdk, immersive-web specs), npm registry, Wikipedia version table for Quest Browser, UploadVR/RoadToVR, Babylon/three.js forums, Meta community forums. Several Meta forum threads return HTTP 403 to automated fetches; where that happened it is noted as a gap.

---

## Key question 0 — Overall Quest Browser WebXR feature-support matrix (with versions)

### Takeaway
Quest Browser (Chromium-based; UA example shows Chrome/136) supports every WebXR module Roomsong needs — `immersive-ar` passthrough, hand input (25 joints), plane detection, mesh detection, hit-test (depth-based since Browser 40.4), anchors incl. persistent anchors (8/site), WebXR Layers, fixed foveation, and frame-rate control — but Meta's web docs rarely state minimum versions for MR features, so version evidence is a mix of release notes, the Wikipedia version table and press.

### Cited Findings
| Capability | Status | Evidence |
|---|---|---|
| `immersive-ar` passthrough | CONFIRMED | Meta MR doc: request `navigator.xr.requestSession("immersive-ar")`, check `isSessionSupported('immersive-ar')`, render on transparent background — [Meta: WebXR Mixed Reality](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). Doc text is stale ("Color on Quest Pro; grayscale on Quest 2") — same source. Quest 3 has "Full color, high resolution" passthrough with a depth sensor — [Meta device optimization comparison](https://developers.meta.com/horizon/resources/device-optimization-comparison/). Quest 3S: color passthrough, XR2 Gen 2, 1832×1920/eye, 72/90/120 Hz — [iFixit Quest 3S](https://ts.ifixit.com/Device/Meta_Quest_3S), [Meta compare page](https://www.meta.com/ca/quest/compare/). |
| Hand tracking (WebXR Hand Input) | CONFIRMED | Enabled by default in Browser 15.1 (2021-03-30); multimodal hands+controllers in 34.1 (2024-07-09) — [Wikipedia: Meta Quest Browser version table](https://en.wikipedia.org/wiki/Meta_Quest_Browser). 25 joints, `getJointPose`/`fillPoses` — [Meta: WebXR Hands](https://developers.meta.com/horizon/documentation/web/webxr-hands/). |
| Plane detection | CONFIRMED | `"plane-detection"` feature descriptor; `session.detectedPlanes`; planes from Space Setup are "always horizontal or vertical rectangles" — [Meta MR doc](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). "Depth" and "Planes" permissions merged into a single "Spatial" permission in Browser 36.2 (2024-12-16) — [Wikipedia](https://en.wikipedia.org/wiki/Meta_Quest_Browser). |
| Mesh detection | CONFIRMED (via IWSDK doc) | IWSDK ch.11: `XRMesh` with `isBounded3D`, `semanticLabel`, `dimensions`, `min`, `max`; bounded meshes + global mesh — [Meta IWSDK ch.11 Scene Understanding](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/). IWER blog: "high-fidelity scene meshes exposed on Meta Quest 3 and 3S devices" — [Meta blog: IWER](https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/). |
| Hit-test | CONFIRMED | Browser 40.4 (2025-10-10): "the WebXR Hit Testing API now uses Meta's Depth API under the hood, not the Scene Mesh" — no Space Setup needed for basic hit test; "only appropriate for spawning simple stationary objects" — [UploadVR](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/). |
| Anchors / persistent anchors | CONFIRMED | `requestPersistentHandle` on XRAnchor, `restorePersistentAnchor` on XRSession; "A site can currently only create 8 persistent anchors at a time"; not persistent in private mode; clearing site history deletes them — [Meta MR doc](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). Spec (Editor's Draft 2026-04-27) also defines `persistentAnchors` and `deletePersistentAnchor` — [W3C Anchors Module ED](https://immersive-web.github.io/anchors/). |
| WebXR Layers | CONFIRMED | "WebXR Layers and Media Layers enabled by default" in Browser 16.1 (2021-06-07) — [Wikipedia](https://en.wikipedia.org/wiki/Meta_Quest_Browser); cylinder/equirect/cube layer samples — [Meta: WebXR Layers](https://developers.meta.com/horizon/documentation/web/webxr-layers/). |
| Fixed foveation | CONFIRMED | `optionalFeatures: ['high-fixed-foveation-level' | 'medium-…' | 'low-…']` or `XRWebGLLayer.fixedFoveation` 0–1; FFR disabled by mid-frame render-target switches (e.g., shadow maps), which also disables MSAA — [Meta: WebXR FFR](https://developers.meta.com/horizon/documentation/web/webxr-ffr/). Smooth foveation since Browser 36.0 (2024-11-07) — [Wikipedia](https://en.wikipedia.org/wiki/Meta_Quest_Browser). |
| Frame-rate control | CONFIRMED | `session.frameRate`, `supportedFrameRates`, `updateTargetFrameRate()` since Browser 16.4; default 72 fps on Quest headsets (90 on Quest 2) — [Meta: WebXR frame rate](https://developers.meta.com/horizon/documentation/web/webxr-frames/). |
| Depth sensing (for occlusion) | LIKELY / experimental | Browser 146.0 (2026-04-21): "Experimental WebGPU and WebXR depth projection support" — [Meta: Browser release notes](https://developers.meta.com/horizon/documentation/web/browser-release-notes/). |
| Recent browser versions | CONFIRMED | 152.1 (2026-10-02, experimental WebGPU composition layers), 150.1 (2026-08-28, experimental WebGPU foveation), 149.1 (2026-07-27, WebGPU space-warp layers), 146.0 (2026-04-21), 42.0 (2026-01-26) — [Meta: Browser release notes](https://developers.meta.com/horizon/documentation/web/browser-release-notes/). |
| Chromium base | LIKELY | Example UA string `Chrome/136.0.7103.177` (page says illustrative) — [Meta: Browser specs](https://developers.meta.com/horizon/documentation/web/browser-specs/). |

### Inferences
- The version numbering jumped from 42.0 (Jan 2026) to 146.0 (Apr 2026), which strongly suggests Meta realigned Quest Browser version numbers with the Chromium milestone in early 2026; treat "Browser 146+" as "Chromium 146-class" for Web Audio / AudioWorklet / WebGL2 feature parity (inference, not stated by Meta).
- Meta's MR doc has not been updated for Quest 3/3S (still talks about Quest Pro color / Quest 2 grayscale), so absence of a feature in that doc is not evidence of absence.

### Gaps
- No single official Meta "WebXR feature support matrix with browser versions" page exists; the browser-specs page explicitly pushes runtime feature detection instead.
- Minimum browser versions for plane detection, mesh detection, anchors and persistent anchors are not stated in Meta web docs; the Wikipedia table ends at 36.2 (Dec 2024).

---

## Key question 1 — `immersive-ar` passthrough sessions

### Takeaway
CONFIRMED on Quest 3/3S: request `immersive-ar`, render with a transparent clear colour; colour passthrough on Quest 3/3S. The "Spatial" permission prompt covers planes/depth, and the left-hand palm-pinch system gesture exits the session.

### Cited Findings
- `navigator.xr.requestSession("immersive-ar")`; detect with `isSessionSupported('immersive-ar')`; "Content must render on transparent backgrounds to show the passthrough environment" — [Meta: WebXR Mixed Reality](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/)
- IWSDK `npm create @iwsdk` offers "Mixed reality / passthrough: Starts with virtual content in the physical environment" as a starting target — [Meta IWSDK ch.01 Project setup](https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/)
- Browser 36.2: "'Depth' and 'Planes' permissions in WebXR combined into single 'Spatial' permission" — [Wikipedia: Meta Quest Browser](https://en.wikipedia.org/wiki/Meta_Quest_Browser)
- "palm pinch on both hands [is] reserved … for system use"; left-hand palm pinch exits WebXR sessions — [Meta: WebXR Hands](https://developers.meta.com/horizon/documentation/web/webxr-hands/)
- Quest 3 passthrough shows "double-imaging on moving objects or hands nearby … this ghosting is present on your hands and arms" — [UploadVR Quest 3 hands-on](https://www.uploadvr.com/quest-3-hands-on-impressions/)
- Forum report of WebXR passthrough on Quest 2 only working at one head position (device-specific bug) — [Meta forum](https://communityforums.atmeta.com/discussions/dev-other-dev/web-xr-passthrough-on-quest2-only-works-at-one-specific-head-position/1043219)

### Inferences
- Roomsong must set `renderer.setClearAlpha(0)`/transparent background and avoid full-screen post-processing passes that write opaque pixels; this also matters for FFR (see Q8).
- The left-hand palm-pinch exit gesture is a hazard for a hands-first app: a "pull to grow" gesture done with the left palm facing the headset could be misread as the system gesture. Design gestures away from palm-facing-headset + pinch.

### Gaps
- No official statement of passthrough latency or colour fidelity in the browser specifically.

---

## Key question 2 — Hand tracking in WebXR (joints, radii, update rate, pinch, occlusion, jitter/latency)

### Takeaway
CONFIRMED: 25 joints/hand with `radius` always supplied (emulated if unknown), pinch exposed as `select` events, all-or-nothing null poses on occlusion. No browser-specific latency/jitter numbers exist; native Quest 2 was measured at 45 ms delay / 1.1 cm fingertip error (2024 study), and Meta claims Hands 2.2 cut latency up to 40% (75% in Fast Motion Mode). Pinch quality for 16-step placement on a 0.12–0.30 m ring is NEEDS-POC.

### Cited Findings
- 25 skeleton joints per hand; `getJointPose` (per joint) or `fillPoses` (batch); joint order per W3C spec; Three.js stores joints in `WebXRController.joints`; Meta's "generic-hand" assets in webxr-input-profiles — [Meta: WebXR Hands](https://developers.meta.com/horizon/documentation/web/webxr-hands/)
- Regular pinch "map[s] to emulated Gamepad button presses" (i.e., `select`); target ray "assumes that the UI is in front of the user"; palm pinch reserved for system — [Meta: WebXR Hands](https://developers.meta.com/horizon/documentation/web/webxr-hands/)
- Spec: `XRJointPose.radius` is "the radius of the skeleton joint in meters" and "The user-agent MUST set radius to an emulated value if the XR device does not have the capability of determining this value"; "When a hand is partially obscured the user agent MUST either emulate the obscured joints, or report null poses for all of the joints" — [W3C WebXR Hand Input Module ED, 2024-06-05](https://immersive-web.github.io/webxr-hand-input/)
- WebXR deliberately does not define gesture events; developers measure thumb-tip to index-tip distance with their own threshold — [dmnshd.gg WebXR hand tracking](https://dmnshd.gg/blog/webxr-hand-tracking)
- Developers report joints "quite jittery, particularly when aiming at UI and pinch clicking", and that smoothing filters "add significant latency" — [Matrix WebXR room log](https://view.matrix.org/room/!kGYPfZJnRmMlqqETSr:matrix.org/) (secondary, informal)
- Quest 2 hand tracking measured: "45.0 ms" temporal delay, "1.1cm" fingertip positional error, 9.6° joint-angle error (Abdlkarim et al., 2024) — [Goldsmiths Research Online](https://research.gold.ac.uk/id/eprint/36601)
- Hands 2.2 (OS v56, 2023): "up to 40% latency reduction in typical usage and up to 75% during fast movement" (Fast Motion Mode); Wide Motion Mode on Quest 3 — [Meta blog: Hands 2.2](https://developers.meta.com/horizon/blog/hand-tracking-22-response-time-meta-quest-developers/)
- Quest 3 hand tracking "delivers less jitter, superior accuracy, and better handling of hand overlap" vs PSVR2 — [UploadVR](https://www.uploadvr.com/playstation-vr2-hand-tracking-compared-to-quest-3-waltz-of-the-wizard/)
- IWSDK 1.0 adds "gaze-and-pinch interaction through `world.xr.features.gazeTracking`" (relevant to VR Glasses eye tracking; Quest 3/3S have no eye tracking) — [Meta: IWSDK v1.0 package page](https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/)

### Inferences
- Use the browser's `selectstart`/`selectend` for primary pinch (it is Meta's own pinch classifier) and reserve a custom thumb-index distance only for continuous "pinch strength" (e.g., pull-to-grow). This avoids re-deriving pinch and matches system behaviour.
- Joint radii are available on Quest (CONFIRMED by spec requirement) and can size the fingertip collider for ring-step hit-testing.
- Hand update rate in the browser is bounded by `requestAnimationFrame` of the XR session (72/90 Hz); Fast/Wide Motion Mode toggles are native OpenXR extensions with no documented WebXR exposure — treat as unavailable.
- Occlusion rule (all-or-nothing nulls) means a hand reaching under the table edge may disappear for whole frames; Roomsong needs a "hand lost" grace period (e.g., 150–250 ms) before cancelling a drag.

### Gaps
- No published WebXR-in-browser latency or jitter figures for Quest 3/3S; no confirmation whether Hands 2.2/2.3 improvements apply inside Quest Browser (LIKELY, since tracking is OS-level).
- **NEEDS-POC (PoC-H1, ~30 min):** load the IWSDK MR template on a borrowed Quest 3, place a 0.20 m ring of 16 targets at table height, log `selectstart` positions and thumb-tip/index-tip distance per frame for 50 pinches; measure hit-rate per step and the pinch distance distribution (expect to derive a threshold around 1.5–2.5 cm; measure, do not assume) and record jitter (std-dev of index-tip over 2 s stationary).

---

## Key question 3 — Plane detection, semantic labels, Space Setup, permission decline

### Takeaway
CONFIRMED: planes come from Space Setup (horizontal/vertical rectangles), `initiateRoomCapture()` can launch Space Setup once per session, wait 2–3 s before judging `detectedPlanes` empty. Semantic labels for planes are LIKELY (registry: `table`, `desk`, `wall`, `floor`, `ceiling`, …) but Meta's web doc does not list them; behaviour on permission decline is LIKELY empty `detectedPlanes` (NEEDS-POC).

### Cited Findings
- `"plane-detection"` feature; "Surfaces defined in boundary settings appear as planes"; planes "always horizontal or vertical rectangles"; `initiateRoomCapture` "triggers space setup from an immersive session (recommended when no planes detected; usable once per session)"; "Wait 2-3 seconds after session creation before checking for planes" — [Meta: WebXR Mixed Reality](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/)
- IWSDK ch.11: planes include orientation (`horizontal`, `vertical`) via `_plane`; "If you are running on a Meta Horizon OS device, ensure that the room scan (environment setup) is finished"; semantic label values "listed in the WebXR semantic labels registry"; code examples use `table`, `chair`, `wall` — [Meta IWSDK ch.11](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/)
- Registry `labels.json` (exact strings): `desk`, `couch`, `floor`, `ceiling`, `wall`, `door`, `window`, `table`, `shelf`, `bed`, `screen`, `lamp`, `plant`, `wall art`, `global mesh`, `other` — [immersive-web/semantic-labels labels.json](https://raw.githubusercontent.com/immersive-web/semantic-labels/master/labels.json)
- Unity/OpenXR on Quest: "Meta OpenXR does not dynamically discover planes at runtime. Instead, it queries the device's Room Setup data"; labels map e.g. `TABLE → Table`, `WALL_FACE → Wall` — [Unity Meta OpenXR plane detection](https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@1.0/manual/features/plane-detection.html) (native, not browser; corroborates data source)
- Since OS v57 apps need `com.oculus.permission.USE_SCENE`; "If the detectedPlanes array remains empty, this can indicate that the user didn't grant permission" — [Meta forum (Unity, v57)](https://communityforums.atmeta.com/discussions/dev-unity/space-setup-issues-with-v57-quest-developing-with-unity-openxr-ar-foundation-/1082633) (native)
- Three.js forum: "The required feature 'plane-detection' is not supported" when requested as a *required* feature on unsupported runtimes — [three.js discourse](https://discourse.threejs.org/t/the-required-feature-plane-detection-is-not-supported/48299)
- Babylon forum thread on plane detection in Quest 3 passthrough (exists; details not retrieved) — [Babylon forum](https://forum.babylonjs.com/t/webxr-plane-detection-on-quest-3-passthrough/57422)

### Inferences
- Request `plane-detection`, `mesh-detection`, `anchors` as **optional** features so the session still starts when the user declines Spatial permission; then fall back to depth-based hit-test (Q5) or a user-placed anchor at a pinched point.
- Note the registry contains both `table` and `desk`; Roomsong's placement solver must accept both (and probably `shelf`, `other` horizontal planes) when picking a surface.
- `chair`/`couch` in the IWSDK example refer to bounded meshes rather than planes; wall/ceiling/floor come as planes.

### Gaps
- Meta's web docs never state that `XRPlane.semanticLabel` is populated in Quest Browser; evidence is indirect (IWSDK doc + registry). **NEEDS-POC (PoC-P1, ~20 min):** in an `immersive-ar` session on a room with Space Setup done, dump `plane.semanticLabel`, `orientation`, polygon extents for every plane; confirm table/desk label and the table plane's height/size.
- What happens on permission decline in the browser (session fails vs. empty sets) is undocumented. **NEEDS-POC (PoC-P2, ~10 min):** decline the Spatial prompt and log `session.enabledFeatures`, `detectedPlanes.size`, and whether `initiateRoomCapture()` is callable.

---

## Key question 4 — Mesh detection (room mesh vs furniture) and reliability

### Takeaway
CONFIRMED (IWSDK doc + IWER blog): Quest Browser exposes bounded 3D meshes with semantic labels and a `global mesh`; Quest 3/3S provide high-fidelity scene meshes. Reliability reports for the browser are absent (gap).

### Cited Findings
- `XRMesh` component: "Bounded meshes: Individual objects with semantic classification"; "Global mesh: Generic scene structure geometry"; properties `isBounded3D`, `semanticLabel`, `dimensions`, `min`, `max`; limitations: "Device-specific anchor count limitations", "Requires adequate visual features for tracking", "Performance considerations with multiple scene understanding entities" — [Meta IWSDK ch.11](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/)
- IWER "supports emulation of high-fidelity scene meshes exposed on Meta Quest 3 and 3S devices" — [Meta blog: IWER](https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/)
- Depth-based hit test is "only appropriate for spawning simple stationary objects … If entities need to move around surfaces or interact with any of the rest of the room, a scanned Scene Mesh will still be needed" — [UploadVR](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/)

### Inferences
- For "room signature" (room geometry → key/tempo/reverb) the `global mesh` bounding box or the wall/floor/ceiling planes give room dimensions without needing the full mesh; use planes first (cheaper), mesh only if present.
- The global mesh can be large; never render it per frame, only sample it once at session start.

### Gaps
- No community reliability data for mesh detection in Quest Browser (frequency of updates, triangle counts). **NEEDS-POC (PoC-M1, ~15 min):** log `detectedMeshes` count, labels, vertex counts and `lastChangedTime` over 60 s.

---

## Key question 5 — Hit-test

### Takeaway
CONFIRMED: WebXR hit-test works on Quest 3/3S and since Browser 40.4 (2025-10-10) uses the Depth API, so it works without Space Setup; Meta says it's suited to placing stationary objects.

### Cited Findings
- Browser 40.4: hit test uses Depth API, no Scene Mesh needed; Depth API "works up to around 5 meters" — [UploadVR 2025-10-10](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/)
- IWER/Emulator supports the WebXR Hit Test Module; `@iwer/sem` "Enables hit-test APIs through IWER by conducting real-time raycasting spatial queries" — [@iwer/sem README](https://cdn.jsdelivr.net/npm/@iwer/sem@2.3.0/README.md)
- IWSDK template toggles include "real-world placement" alongside "room surfaces, anchors" — [Meta IWSDK ch.01](https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/)
- Spec: `XRHitTestTrackableType` = `point`, `plane`, `mesh` — [W3C Hit Test Module](https://www.w3.org/TR/webxr-hit-test/)

### Inferences
- Hit-test is the right fallback for the garden bed when there is no `table` plane: pinch-and-hold on the table → hit-test ray from the index tip → anchor there.

### Gaps
- Whether IWSDK ch.11 wraps hit-test in a component (the doc fetched mentions only planes/meshes/anchors) — NEEDS-POC in the emulator (PoC-M2, ~15 min: call `session.requestHitTestSource` in the IWSDK MR template, under IWER, and on device).

---

## Key question 6 — Anchors and persistent anchors (limits, restore across sessions, failures)

### Takeaway
CONFIRMED: `XRAnchor.requestPersistentHandle()` + `XRSession.restorePersistentAnchor(uuid)`; max 8 persistent anchors per site; nothing persists in private mode; cleared with site data. Restore across sessions is CONFIRMED by doc text; practical reliability (after reboot, room changes) is NEEDS-POC.

### Cited Findings
- "To create a persistent anchor, call `requestPersistentHandle` on an anchor object"; "the site can call `restorePersistentAnchor` which returns an anchor object at the same position"; "A site can currently only create 8 persistent anchors at a time"; "Anchors are also not persistent if your session is running in private mode"; "Clearing the site's history will also delete the persistent anchors" — [Meta: WebXR Mixed Reality](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/)
- Spec IDL (ED 2026-04-27): `XRAnchor.requestPersistentHandle()`, `XRSession.persistentAnchors`, `restorePersistentAnchor(uuid)`, `deletePersistentAnchor(uuid)` — [W3C Anchors Module ED](https://immersive-web.github.io/anchors/)
- IWSDK `XRAnchor` component: "stable reference points that persist across tracking loss"; "Users manually add this component to entities; the system automatically manages anchor attachment" — [Meta IWSDK ch.11](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/)
- PlayCanvas engine exposes the same persistent API, confirming it is a cross-engine browser feature — [PlayCanvas XrAnchor API](https://api.playcanvas.com/engine/classes/XrAnchor.html)

### Inferences
- Roomsong needs exactly 1 persistent anchor (garden bed origin); 8/site is ample. Store the UUID in IndexedDB alongside the save; on restore, if `restorePersistentAnchor` rejects, fall back to re-placement.
- Whether IWSDK's `XRAnchor` component handles *persistent* handles (vs. session anchors) is not stated → may need direct WebXR calls through `world.xr` session.

### Gaps
- No found reports (2025–26) of persistent-anchor failure modes in Quest Browser. **NEEDS-POC (PoC-A1, ~30 min):** create anchor on table, persist, exit session, reload page, restore; then reboot headset and restore again; measure drift (cm) vs a tape mark.

---

## Key question 7 — WebXR Layers and fixed foveation

### Takeaway
Both CONFIRMED in Quest Browser (Layers since 16.1 in 2021; FFR via optional features or `fixedFoveation` attribute). Roomsong's caption/UI could use a quad layer for crisp text, but note the OS-level VR-Glasses FoV simulator does not mask compositor layers.

### Cited Findings
- WebXR Layers "extend the timewarp functionality … increase performance, enable higher quality rendering of imagery and text"; "you only need to submit rendered content when the layer updates"; polyfill recommended for other browsers — [Meta: WebXR Layers](https://developers.meta.com/horizon/documentation/web/webxr-layers/)
- IWSDK 1.0: "Enhanced native XR layer transforms and fallback behavior" — [Meta: IWSDK v1.0](https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/)
- FFR: `optionalFeatures: ['high-fixed-foveation-level']` etc.; `XRWebGLLayer.fixedFoveation` 0–1; verify with `ovrgpuprofiler -t`; "FFR only applies when rendering to the final frame buffer"; render-target switching mid-frame "disables both FFR and MSAA" — [Meta: WebXR FFR](https://developers.meta.com/horizon/documentation/web/webxr-ffr/)
- OS-level FoV simulation "does not apply the simulated FoV to compositor layers" (fix expected Horizon OS v209) — [Meta: In-headset FoV simulation](https://developers.meta.com/horizon/documentation/unity/in-headset-fov-simulation)

### Inferences
- Avoid Three.js post-processing (EffectComposer) and shadow maps in the XR frame: they switch render targets and kill FFR + MSAA. Roomsong's "Listen mode dimming/halo" should be done in-material (emissive/alpha), not as a post pass.

### Gaps
- Three.js support status for WebXR Layers (quad layers for UI) in r181 not verified — NEEDS-POC only if crisp text layers are pursued (optional).

---

## Key question 8 — Frame-rate targets and realistic Three.js performance budgets on Quest 3/3S (draw calls, triangles, fill-rate, MSAA)

### Takeaway
CONFIRMED: Browser default is 72 fps on Quest 3/3S, adjustable via `updateTargetFrameRate`; hardware supports 72/80/90/120 Hz (Quest 3) and 72/90/120 (3S). Meta's web perf docs give principles, not budgets; the only official number-ish guidance is that ~1000 individual draw calls will drop below 72 fps. Community "under 100 draw calls" guidance is secondary. 120 Hz in the browser is NEEDS-POC.

### Cited Findings
- Default 72 fps (90 on Quest 2); `supportedFrameRates` / `updateTargetFrameRate` since Browser 16.4; lower rate reduces load, higher improves UX; measure inter-frame time to decide — [Meta: WebXR frame rate](https://developers.meta.com/horizon/documentation/web/webxr-frames/)
- Quest 3 and Quest 2 "Both support 72, 80, 90, 120 Hz"; Quest 3 "~2.5x Quest 2 GPU"; 2064×2208/eye; 8 GB RAM — [Meta device optimization comparison](https://developers.meta.com/horizon/resources/device-optimization-comparison/)
- Quest 3S: XR2 Gen 2, 1832×1920/eye, 72/90/120 Hz, 8 GB, 96°×90° FoV — [iFixit Quest 3S](https://ts.ifixit.com/Device/Meta_Quest_3S)
- Meta perf workflow: "submitting 1000 individual triangles as unique draw calls would likely cause your app to run at less than 72 frames per second because of CPU cost, even though the Quest GPU can easily render several orders of magnitude more triangles"; frame budgets 72 fps = 13.7 ms, 90 = 11.1 ms — [Meta: WebXR perf workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/)
- Meta perf best practices: front-to-back to limit overdraw; "Limit yourself to one directional light or one point light if you're making heavy use of PBR materials"; KTX2/Basis textures; stagger non-render updates (e.g., 30 Hz) — [Meta: WebXR perf best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/)
- Secondary: "target under 100 draw calls for the main scene" on Quest 3; "stable 72 fps, minimum 60 fps"; `setFramebufferScaleFactor` on Three.js `WebXRManager` — [abratabia WebXR performance](https://abratabia.com/webxr-games/webxr-performance.php) (non-authoritative tutorial site)
- Babylon forum (2026-04, PC-link scenario, not standalone): bottleneck was "the single thread JS architecture"; ~1500 draw calls needed atlases/thin instances; CSM shadows cost ~7 ms CPU — [Babylon forum](https://forum.babylonjs.com/t/need-tips-on-performance-improvements-in-webxr-vr/63271)
- IWSDK issue #16 (2025-12-08): "Keyboard input causes severe frame stuttering during WebXR on Quest 3" — [facebook/immersive-web-sdk issues](https://github.com/facebook/immersive-web-sdk/issues)
- Meta forum thread "120 fps in WebXR apps" exists but returned HTTP 403 to fetch — [Meta forum](https://communityforums.atmeta.com/discussions/dev-quest/120-fps-in-webxr-apps/861103)

### Inferences
- Budget proposal for Roomsong (derived, not official): ≤100 draw calls (5 rings × 16 steps = 80 seeds must be `InstancedMesh`, not 80 meshes), ≤150k triangles, no shadow maps, no post passes, one directional light, MSAA via the XR layer's `antialias` (default in Three.js), FFR medium, target 72 fps with `updateTargetFrameRate(90)` only if frame time < 9 ms on device.
- Quest 3S has the same SoC and lower display resolution, so it is slightly *easier* on fill-rate than Quest 3; design for Quest 3 pixel count.

### Gaps
- No Meta-published draw-call/triangle budget for WebXR. No three.js-forum thread with Quest 3 standalone numbers was found in this pass.
- 120 Hz availability via `supportedFrameRates` in Quest Browser unconfirmed. **NEEDS-POC (PoC-F1, ~10 min):** log `session.supportedFrameRates` on Quest 3 and 3S in `immersive-ar`; note whether passthrough sessions cap at 72/90.
- MSAA level actually applied by Quest Browser for `XRWebGLLayer({antialias:true})` undocumented. **NEEDS-POC (PoC-F2, ~15 min):** render thin lines; capture via `adb shell screenrecord`/MQDH and inspect; also compare `ovrgpuprofiler` stage counts with/without FFR.

---

## Key question 9 — Web Audio on Quest Browser (latency, HRTF PannerNode, AudioWorklet, voices, autoplay)

### Takeaway
Web Audio is standard Chromium in Quest Browser (LIKELY for AudioWorklet and HRTF PannerNode); no Quest-specific latency figures are published (gap). Known pitfalls: AudioContext must be resumed after a user gesture; HRTF panners click when positions jump instead of ramping; a historical three.js r130–r136 WebXR positional-audio bug caused crackling on Quest.

### Cited Findings
- AudioWorklet runs "on a dedicated real-time system thread for audio processing", separate from main-thread pauses — [MDN AudioWorklet](https://developer.mozilla.org/docs/Web/API/AudioWorklet)
- `AudioContext.outputLatency` gives hardware output latency estimate; "Chrome Web Audio is not particularly doing well in the audio latency department" (general, not Quest) — [web.dev audio output latency](https://web.dev/articles/audio-output-latency), [Hongchan Choi W3C talk](https://w3.org/2021/03/media-production-workshop/talks/hongchan-choi-building-audio-apps.html)
- Three.js issue #22884: positional audio crackling on Quest 2 introduced in r130, persisted through r136; cause in `WebXRManager` matrix handling (PR #21964), fixed by PR #22362 — [three.js #22884](https://github.com/mrdoob/three.js/issues/22884)
- Babylon forum (2021-12): "clicks"/"cracks" in spatial audio when listener/source moved, worse on low frequencies; cause: listener orientation updated ~2×/s with deprecated `setOrientation`; fix: update every frame and use `linearRampToValueAtTime` — [Babylon forum](https://forum.babylonjs.com/t/audio-glitches-in-vr/25673)
- Cross-browser note: on Apple Vision Pro audio stops when an XR session starts, "but on Quest and PICO browsers the audio continues to play once the session is started" — [webrtc/samples #1028](https://github.com/webrtc/samples/issues/1028)
- Autoplay: "The AudioContext was not allowed to start and must be resumed (or created) after a user gesture" — [VLC issue (Chrome 79 autoplay)](https://code.videolan.org/b1ue/vlc/issues/30) (generic Chromium policy)
- IWSDK 1.0 runs Havok physics "in a Web Worker at 60 Hz" — evidence that Workers are used by the SDK in Quest Browser — [Meta: IWSDK v1.0](https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/)
- Immersive Web SDK lists "Spatial audio" among built-in features — [facebook/immersive-web-sdk README](https://github.com/facebook/immersive-web-sdk)

### Inferences
- Create/resume the `AudioContext` inside the click/pinch handler that calls `requestSession` (that handler is a user gesture); also call `resume()` on `visibilitychange`→visible and on session start as belt-and-braces.
- With 80 seeds × possibly overlapping notes, do not use one `PannerNode(HRTF)` per voice; use ≤8 HRTF panners (one per ring or per "tide" position) and equal-power panning for the rest; set `positionX/Y/Z` via `setTargetAtTime` rather than direct assignment to avoid clicks.
- AudioWorklet does **not** require COOP/COEP (only `SharedArrayBuffer` does), so GitHub Pages is fine for a worklet-based scheduler.
- Look-ahead scheduling (Web Audio clock, 100–200 ms horizon) is required because the XR rAF loop can hitch; audio timing must not depend on rAF.

### Gaps
- No Quest Browser `baseLatency`/`outputLatency` numbers found; no published max polyphony. **NEEDS-POC (PoC-W1, ~20 min):** on device, log `ctx.baseLatency`, `ctx.outputLatency`, `sampleRate`; run a stress loop adding oscillator+gain voices until glitches (`AudioContext` underrun detectable by scheduling misses); test 8 vs 32 HRTF panners while rendering the MR template at 72 fps; confirm AudioWorklet loads over HTTPS from a static host.

---

## Key question 10 — IWSDK specifics (version, maturity, ECS, hands/grab, UIKit, scene understanding, native scene JSON, IWER, AI/MCP, deployment, known issues)

### Takeaway
IWSDK reached **1.0.0 on 2026-09-24 and 1.0.1 on 2026-10-01** (npm), pinned to `super-three@0.181.0`, with ECS (elics), grab components, UIKitML spatial UI, scene-understanding components, a native scene JSON editor, IWER 2.5 emulation (hands, planes, meshes, hit-test, VR-Glasses FoV mask), and an AI/MCP toolchain (`iwsdk dev up`, Playwright-managed browser, 32–45 MCP tools). Maturity is early (338 stars, 25 open issues, no GitHub Releases); the most relevant open bug is hand-tracking grab (#10).

### Cited Findings
**Version / activity**
- npm `@iwsdk/core` latest **1.0.1** (2026-10-01); 1.0.0 (2026-09-24); deps: `three: npm:super-three@0.181.0`, `@pmndrs/uikit ^1.0.74`, `@drawcall/uikitml 0.1.8`, `@babylonjs/havok ^1.3.10`, `three-mesh-bvh ^0.9.1`, `elics ^3.4.1`, `@iwsdk/xr-input`, `@iwsdk/locomotor`, `@iwsdk/scene-composition` — [npm registry @iwsdk/core](https://registry.npmjs.org/@iwsdk/core)
- Meta package page: v1.0 released 2026-09-24; gaze-and-pinch via `world.xr.features.gazeTracking`; "Gaze emulation on desktop via IWER 2.5"; "Target-device preview with head-directed test gaze and field-of-view masking"; Havok in Web Worker at 60 Hz; breaking: occupied Vite ports now fail explicitly; check `browserCommandReady` or run `iwsdk runtime wait`; CLI and Vite plugin must be upgraded together; `eyeTracking` alias deprecated — [Meta: IWSDK v1.0](https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/)
- Meta's AI-tooling doc page still says "IWSDK 0.5.3 (updated September 4, 2026)" — stale relative to npm — [Meta: IWSDK AI](https://developers.meta.com/horizon/documentation/iwsdk/ai/)
- GitHub: 338 stars, 70 forks, 25 open issues, 8 PRs, 270 commits on main, MIT; packages `@iwsdk/core`, `@iwsdk/create`, `@iwsdk/locomotor`, `@iwsdk/xr-input`, `@iwsdk/vite-plugin-dev`; "Requires Three.js alias configuration to prevent dependency conflicts" — [facebook/immersive-web-sdk](https://github.com/facebook/immersive-web-sdk); "There aren't any releases here" — [Releases page](https://github.com/facebook/immersive-web-sdk/releases)
- Meta blog (2026-04): AI agent workflow added, supports "Claude Code, Cursor, GitHub Copilot, and Codex" — [RoadToVR](https://roadtovr.com/meta-immersive-web-ai-agent-toolkit-2026/)

**Templates / scaffolding**
- `npm create @iwsdk` targets: "Virtual reality", "Mixed reality / passthrough", "Desktop 3D"; customise toggles: "locomotion, grabbing, physics, room surfaces, anchors, real-world placement"; TS/JS; generated `iwsdk.config.json`, `public/scenes/main.iwsdk.scene.json`, `src/assets.ts`, `src/components.ts`, `src/index.ts`, `vite.config.ts`; scripts `npm run dev`, `dev:status`, `build`, `preview` — [Meta IWSDK ch.01](https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/)

**Hands / grab**
- Grab components: `OneHandGrabbable` (translate+rotate, no scale), `TwoHandsGrabbable` (adds scale), `DistanceGrabbable` (ray-based); entities need `RayInteractable` tag for ray paths; direct-grab handles deny ray-pointer events and vice-versa — [Meta IWSDK grabbing concepts](https://developers.meta.com/horizon/documentation/iwsdk/concepts/grabbing/)
- `PinchPoint` "specifies a moving point at the center of the tips of the currently pinching fingers" — [Meta IWSDK interaction types](https://developers.meta.com/horizon/documentation/iwsdk/concepts/grabbing/interaction-types/)
- Issue #10 (opened 2025-10-30, **still open**): "grabbing not working with OneHandGrabbable when using hand tracking" — root cause: implementation "relies on squeeze events … which cannot be generated by hand tracking"; maintainer said 2025-11-22 it "should be fixed in our latest version"; workaround used by a user: `DistanceGrabbable` — [issue #10](https://github.com/facebook/immersive-web-sdk/issues/10)
- Issue #47 (2026-08-07): DistanceGrabbable fails to return to origin during two-hand manipulation — [issues list](https://github.com/facebook/immersive-web-sdk/issues)
- Troubleshooting: "Hand Tracking Unavailable: Add the hand-tracking feature requirement to your XR session setup" — [Meta: IWSDK troubleshooting](https://developers.meta.com/horizon/documentation/web/iwsdk-troubleshooting)

**Spatial UI**
- Ch.10 uses pmndrs/uikit (GPU-accelerated, HTML/CSS-aligned) and UIKitML markup with Flexbox-like 3D layout, component kits, events, theming — [Meta IWSDK ch.10 Spatial UI](https://developers.meta.com/vr/documentation/iwsdk/guides/10-spatial-ui-uikitml/); compiled UIKitML JSON must sit under `/public/ui` — [troubleshooting](https://developers.meta.com/horizon/documentation/web/iwsdk-troubleshooting)

**Scene understanding (ch.11)** — see Q3/Q4/Q6: `features: { planeDetection: true, meshDetection: true, anchors: true }`; `SceneUnderstandingSystem`, `XRPlane`, `XRMesh`, `XRAnchor` — [Meta IWSDK ch.11](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/)

**Native scene JSON**
- Format `iwsdk.scene.v1`; scene JSON is the authoring source; managed editor with selection/transforms/hierarchy/component editing/screenshots; imports allowed only at authoring; runtime needs an import-free (flattened) scene; only renderable kind is `asset` (GLTF, UIKitML, procedural three objects declared in the asset module) — [Meta IWSDK ch.09 native scene editor](https://developers.meta.com/horizon/documentation/iwsdk/guides/09-native-scene-editor/), [tessl iwsdk-compose-scene](https://tessl.io/registry/skills/github/facebook/immersive-web-sdk/iwsdk-compose-scene)

**IWER emulator**
- IWER supports WebXR Device API, Gamepads, Hand Input, AR module, Hit Test, Plane Detection; `@iwer/sem` adds video passthrough, plane & mesh detection (incl. Quest 3/3S hi-fi meshes), hit-test; programmatic API for code-driven control — [Meta blog: IWER](https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/), [@iwer/sem README](https://cdn.jsdelivr.net/npm/@iwer/sem@2.3.0/README.md)
- npm `iwer` latest 2.5.0 (2026-09-24); 2.4.0 (2026-09-11); 2.3.0 (2026-07-09) — [npm registry iwer](https://registry.npmjs.org/iwer)
- Ch.02 testing: input modes controllers / hands with gaze (pinch) ; device profiles "Meta Quest 3 (default)" and "Meta VR Glasses (with field-of-view mask preview)"; hand depth via mouse wheel; FoV mask "does not replace the host's XRView projection matrix, reproduce lens-edge shape, or expand a host projection"; gaze is pose-only — [Meta IWSDK ch.02 Testing](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/)
- Meta IWER blog claims semantic labels are emulated ("plane and mesh detection, semantic labels, and hit testing"), but the `@iwer/sem` README fetched does **not** mention semantic labels or anchors — [IWER blog](https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/) vs [@iwer/sem README](https://cdn.jsdelivr.net/npm/@iwer/sem@2.3.0/README.md)

**AI / MCP tooling**
- Commands: `npx iwsdk dev up` (dev server + managed Playwright browser), `npx iwsdk dev status`, `npx iwsdk adapter sync`, `npx iwsdk mcp inspect [--tool <name>]`; managed browser has Runtime and Editor views; modes `collaborate` (headed) and `agent` (headless); "45 public tools" covering session/pose/hand/input control, screenshots, console, scene validation/composition, hierarchy/render-stat inspection, UIKitML preview, ECS inspection/mutation/stepping/snapshots; Claude gets native skills + `CLAUDE.md` shim; others via MCP; compositions with imports must be flattened before runtime — [Meta: IWSDK AI](https://developers.meta.com/horizon/documentation/iwsdk/ai/)
- Older doc variant: vite-plugin-iwer MCP server with 32 tools in 5 categories (session, device control, observation incl. `capture_canvas`/`get_console_logs`, scene inspection, ECS debugging); prerequisites Node 18+, Chromium browser, Claude Code CLI; `--bundle` for air-gapped — [Meta: IWSDK AI-assisted dev tooling](https://developers.meta.com/horizon/documentation/web/iwsdk-ai-assisted-dev-tooling)
- Issue #48 (2026-08-08): managed browser won't refresh code changes when Scene Editor is active — [issues](https://github.com/facebook/immersive-web-sdk/issues)

**Deployment / other known issues**
- Issue #44 (2026-05-23): GitHub Pages sub-path deploys 404 on textures/GLTF/audio because templates used bare string paths; fixed by commit 3cb6a89 (2026-07-09); use `import.meta.env.BASE_URL` — [issue #44](https://github.com/facebook/immersive-web-sdk/issues/44)
- #51 three.js r181 compatibility problem; #54 (2026-09-24) AnimatedController crashes on controllers with fewer buttons (Samsung Galaxy XR); #16 keyboard stutter on Quest 3; #22 missing deps in @iwsdk/core; #24 raycast not operational; #36 invisible button zones obstruct raycasting; #53 cursor degradation after rotation — [issues](https://github.com/facebook/immersive-web-sdk/issues)
- Dev server HTTPS: "IWSDK generates and caches a locally generated development certificate without installing a certificate authority"; headsets show a cert warning to accept; access via LAN IP or ADB port forwarding — [Meta IWSDK ch.02](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/)
- Progressive Web Apps can be packaged and submitted to the Meta Horizon Store; "build a WebXR experience with v0 by Vercel and open it on your headset" — [Meta Connect 2026 developer recap](https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/)

### Inferences
- Pin `@iwsdk/core@1.0.1` and the matching CLI/vite plugin (Meta warns against mixed versions). Alias `three` → `super-three@0.181.0` exactly as the template does; do not install a separate `three`.
- Because #10 shows IWSDK's direct grab historically depended on `squeeze` (controllers only), Roomsong's hand interactions (pinch-to-plant, drag, pull) should be implemented against the WebXR hand joints / `select` events through `@iwsdk/xr-input`, with IWSDK grab components used only where verified under hands in the emulator *and* on device.
- Emulator coverage for Roomsong's critical path is good (hands with pinch, planes, meshes, hit-test, passthrough video) but anchor persistence and semantic labels in IWER are unverified → first emulator spike should print `plane.semanticLabel` and try `requestPersistentHandle` under IWER.
- The AI loop (`iwsdk dev up` + MCP `capture_canvas`/ECS tools) makes a headless CI smoke test feasible: run `agent` mode, step ECS, snapshot, assert.

### Gaps
- No changelog/Releases on GitHub; feature deltas are only visible on the Meta package page. The npm package exists, but **a repo's existence is not proof the hand path works on device** — PoC-H1 covers it.
- Whether IWER emulates `semanticLabel` and persistent anchors: NEEDS-POC in emulator (no headset needed, ~20 min).

---

## Key question 11 — Emulators and tools: Immersive Web Emulator extension, Meta XR Simulator, MQDH, remote debugging, self-signed certs

### Takeaway
Two Meta emulators exist: the older Chrome/Edge extension (Immersive Web Emulator, MV3, hands + AR + hit-test + planes) and IWER (in-page runtime used by IWSDK; recommended path). Meta XR Simulator is an OpenXR runtime for Unity/Unreal with no documented WebXR role. Remote debugging is standard `chrome://inspect` over adb; MQDH is device management, not a browser devtool. Self-signed dev certs just need a one-time accept in Quest Browser.

### Cited Findings
- Immersive Web Emulator extension: "capable of simulating all Meta Quest headsets"; 3D viewport; controller inputs; "hand input with built-in hand poses and pinch gesture control"; MV3; supports Device API, Gamepads, Hand Input, AR, Hit Test, Plane Detection modules — [Meta blog: Immersive Web Emulator](https://developers.meta.com/horizon/blog/webxr-development-immersive-web-emulator), [GitHub meta-quest/immersive-web-emulator](https://github.com/meta-quest/immersive-web-emulator/), [Chrome Web Store](https://chromewebstore.google.com/detail/cgffilbpcibhmcfbgggfhfolhkfbhmik); v1.1 "The MR Update" — [Meta blog](https://developers.meta.com/horizon/blog/immersive-web-emulator-1-1)
- Meta XR Simulator: "Offers VR Glasses profile with hand tracking via laptop camera" (listed with Unity/Unreal tooling); IWSDK Emulator listed separately for web — [Meta Connect 2026 developer recap](https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/); XR Simulator getting-started lives under Unreal docs — [Meta: xrsim getting started](https://developers.meta.com/vr/documentation/unreal/xrsim-getting-started/)
- Remote debugging: enable Developer Mode + USB setup; `adb devices`; `adb reverse tcp:8080 tcp:8080`; desktop Chrome `chrome://inspect/#devices` → inspect; "Meta Quest Developer Hub offers an alternative connection and management interface"; applies to WebXR content — [Meta: Browser remote debugging](https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/)
- Dev cert: generated locally, no CA install; headset shows normal cert warning, accept; LAN IP or `adb reverse tcp:5173 tcp:5173` then `https://localhost:5173` — [Meta IWSDK ch.02](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/), [Meta: remote debugging](https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/)
- Node-RED community thread on HTTPS/SSL setup for local Quest WebXR dev (corroborates cert-accept workflow) — [discourse.nodered.org](https://discourse.nodered.org/t/setup-of-https-ssl-local-webxr-quest-development/96224)

### Inferences
- Meta XR Simulator has no relevance to a WebXR build (it is an OpenXR runtime for engine builds); the only VR-Glasses preview for web is IWER's FoV mask plus on-device `metavr device fov-sim`.
- For a remote tester (headset owner elsewhere), deploy to a public HTTPS host (GitHub Pages/Vercel) and capture logs via an in-page console overlay or the MCP `get_console_logs` equivalent, since `chrome://inspect` needs USB.

### Gaps
- Whether the Chrome extension still receives updates in 2026 (IWSDK docs point to IWER instead) — not verified; treat the extension as secondary.

---

## Key question 12 — Static-host deployment pitfalls (HTTPS, headers, COOP/COEP, base paths, PWA)

### Takeaway
HTTPS is mandatory (CONFIRMED); GitHub Pages cannot set COOP/COEP (CONFIRMED) but Roomsong does not need them unless it uses `SharedArrayBuffer`; sub-path deploys broke IWSDK templates until 2026-07 (fixed; use `BASE_URL`).

### Cited Findings
- "Browsers only allow WebXR on secure origins, which is why HTTPS is mandatory" — [Meta IWSDK ch.02](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/); troubleshooting: "Ensure your site is served over HTTPS" — [IWSDK troubleshooting](https://developers.meta.com/horizon/documentation/web/iwsdk-troubleshooting)
- GitHub Pages does not support custom COOP/COEP/CORP headers; "no ETA"; workaround `coi-serviceworker` or a CDN/proxy (Cloudflare, Netlify) — [GitHub Community discussion #13309](https://github.com/orgs/community/discussions/13309), [wasmer docs](https://docs.wasmer.io/sdk/wasmer-js/how-to/coop-coep-headers)
- IWSDK #44: sub-directory base path 404s on assets; fixed 2026-07-09; use `import.meta.env.BASE_URL` — [issue #44](https://github.com/facebook/immersive-web-sdk/issues/44)
- PWAs can be packaged and submitted to the Horizon Store — [Meta Connect 2026 developer recap](https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/)

### Inferences
- GitHub Pages is adequate (HTTPS, static) as long as Roomsong avoids `SharedArrayBuffer`; Havok physics in a Worker (IWSDK 1.0) uses WASM but Workers do not require cross-origin isolation unless they use SAB — verify in the build (if a `SharedArrayBuffer` error appears, either disable physics or move to Vercel with headers).
- Set Vite `base` to `/<repo>/` for Pages; prefer a custom domain or Vercel root to sidestep base-path bugs entirely.

### Gaps
- Not verified whether `@babylonjs/havok` in IWSDK 1.0's worker mode needs SAB. **NEEDS-POC (PoC-D1, ~15 min, no headset):** build the MR template with physics on, deploy to a Pages sub-path, open in desktop Chrome with IWER, check console for cross-origin-isolation errors and asset 404s.

---

## Key question 13 — "Meta VR Glasses": FoV numbers, device readiness, FoV simulation, WebXR support

### Takeaway
CONFIRMED: Meta VR Glasses (announced Connect 2026-09-24; ship spring 2027; $1,299.99; ~100 g; tethered puck) have nominal 70°×66° FoV (render extent 74°×68°, p90 perceived 58°×54°), hands+eyes as primary input, same OS/Store/SDKs as Quest, Quest 3/3S apps "at parity or better". Web/IWSDK is an official build path with FoV simulation available both in IWER (mask) and on a Quest 3/3S via `metavr device fov-sim`.

### Cited Findings
- Announced at Connect 2026; ~100 g glasses + pocket compute puck; $1,299.99; spring 2027; "70° horizontal × 66° vertical" vs Quest 3 "~110° × 96°"; dual 120 Hz 2412×2288 micro-OLED; Snapdragon Reality Elite; hand (4-camera), eye and face tracking; Touch Plus optional — [UploadVR](https://www.uploadvr.com/meta-vr-glasses-officially-announced-connect-2026/), [RoadToVR](https://roadtovr.com/meta-vr-glasses-unveiled-price-release-date/)
- Developer FoV page: "Nominal straight-ahead" 70×66; "Per-eye render extent" 74×68; "P90 perceived target" 58×54; "Do not use the render extent or display resolution as a visible UI boundary"; keep critical content near centre; avoid dense small targets near boundaries; "Web/IWSDK" is a listed build path with (1) `metavr` device-level workflow, (2) desktop emulation of input and FoV, (3) "IWSDK device preview on a headset" which "does not reproduce lens-edge shape or replace the headset's projection" — [Meta: Field of view essentials](https://developers.meta.com/vr/essentials/field-of-view)
- `metavr device fov-sim enable` (70×66), `--perceived` (58×54), `disable`; "applies FoV simulation directly to Horizon OS on the connected headset. It is not specific to Unity"; supported on Quest 3S, Quest 3, Quest Pro; does not affect compositor layers until OS v209 — [Meta: In-headset FoV simulation](https://developers.meta.com/horizon/documentation/unity/in-headset-fov-simulation)
- Device Readiness Check Tool "scanning your project and generating a readiness report targeting Meta VR Glasses"; checks "controller-to-hands migration and field-of-view validation"; AI mode — [Meta: device readiness (Unity docs)](https://developers.meta.com/horizon/documentation/unity/device-readiness/)
- Connect recap: "hands and eyes as primary inputs"; v207 SDK available now; Meta VR CLI; IWSDK Emulator supports "input and field-of-view simulation on Mac/PC"; VR Glasses "run the same operating system, Store, and SDKs as Meta Quest"; Quest 3/3S apps "should run at parity or better"; competition 2026-09-24 → 2026-11-18, $1M — [Meta Connect 2026 developer recap](https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/)
- Competition targets "hands-first" Quest and VR Glasses apps; 20 prizes up to $100k — [UploadVR competition article](https://www.uploadvr.com/meta-launches-1-million-competition-for-hands-first-apps-ahead-of-vr-glasses/)
- IWSDK 1.0 / IWER 2.5: "Meta VR Glasses (with field-of-view mask preview)" device profile; gaze emulation — [Meta IWSDK ch.02](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/), [Meta: IWSDK v1.0](https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/)

### Inferences
- Because the Glasses run Horizon OS with the same browser stack, Quest Browser WebXR apps should run there (LIKELY; no explicit "Quest Browser on VR Glasses" statement found). Design to the p90 58°×54° box: a 0.30 m ring at 0.5 m viewing distance subtends ~33°, which fits; at 0.35 m it is ~46° and starts crowding the vertical 54° budget — keep the bed ≤0.30 m and the seated viewing distance ≥0.45 m (geometry, derived).
- Since the OS FoV simulator ignores compositor layers, do not put captions in a WebXR quad layer if you want the sim to show clipping; render captions in the projection layer for testing.
- The Device Readiness Check appears Unity-oriented; for the web build, "readiness" evidence should be a screenshot with the IWER VR-Glasses mask and a `metavr fov-sim --perceived` capture on a borrowed Quest.

### Gaps
- No explicit statement that Meta Quest Browser / WebXR will ship on VR Glasses at launch (strong inference only).
- Whether the Device Readiness Check Tool accepts IWSDK/web projects — not found.
- Eye-tracking exposure to WebXR on Glasses (IWSDK `gazeTracking` implies a browser API) — version/feature name unverified.

---

## Key question 14 — Consolidated NEEDS-POC list (each <1 h on a borrowed Quest 3/3S unless noted)

### Takeaway
Nine short PoCs close the remaining uncertainty; four can be run without a headset in IWER.

### Cited Findings
| ID | Item | Where | Steps (≤1 h) | Pass criterion |
|---|---|---|---|---|
| PoC-E0 | IWER coverage: `semanticLabel`, persistent anchors, hit-test in emulator | Desktop (IWER 2.5) | `npm create @iwsdk@latest` MR template → log `plane.semanticLabel`, `requestHitTestSource`, `anchor.requestPersistentHandle()` | Labels present; hit-test returns; note if persistent handle rejects (then device-only) — [IWER blog](https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/) |
| PoC-D1 | Static deploy on sub-path with physics worker | Desktop | Build, deploy to Pages sub-path, open with IWER, check 404s/SAB errors | No 404s, no cross-origin-isolation error — [issue #44](https://github.com/facebook/immersive-web-sdk/issues/44) |
| PoC-P1 | Plane labels & table geometry on device | Quest 3 | Dump `detectedPlanes` labels/orientation/polygons after Space Setup | `table` or `desk` horizontal plane with plausible height — [Meta MR doc](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/) |
| PoC-P2 | Spatial-permission decline | Quest 3 | Decline prompt; log `enabledFeatures`, `detectedPlanes.size`; try `initiateRoomCapture()` and hit-test | Session starts; fallback path works |
| PoC-M1 | Mesh detection content | Quest 3 | Log meshes, labels, vertex counts over 60 s | Global mesh + bounded meshes with labels |
| PoC-A1 | Persistent anchor restore & drift | Quest 3 | Persist, reload, restore; reboot, restore; tape-measure drift | Restore succeeds twice; drift ≤2 cm |
| PoC-H1 | Pinch placement accuracy & jitter on 16-step ring | Quest 3 | 50 pinches on 0.20 m ring; log `selectstart` pos + thumb-index distance; 2 s stationary jitter | ≥90% correct step; jitter std-dev ≤3 mm (target, not sourced) |
| PoC-F1/F2 | Frame rates, MSAA, FFR | Quest 3 + 3S | Log `supportedFrameRates`; render 80 instanced seeds + tide; `ovrgpuprofiler -t` with/without FFR | 72 fps stable; note if 90/120 offered in `immersive-ar` — [Meta FFR doc](https://developers.meta.com/horizon/documentation/web/webxr-ffr/) |
| PoC-W1 | Web Audio latency & voices | Quest 3 | Log `baseLatency`/`outputLatency`; ramp voices; 8 vs 32 HRTF panners; AudioWorklet load over HTTPS | No glitches at 24 voices + 8 HRTF at 72 fps (target) |
| PoC-G1 | VR-Glasses FoV sim | Quest 3/3S | `npx metavr device fov-sim enable --perceived`; view garden seated | Whole bed + captions visible inside mask — [Meta FoV sim](https://developers.meta.com/horizon/documentation/unity/in-headset-fov-simulation) |

### Inferences
- Order on a one-day headset loan: E0/D1 beforehand (no headset), then P1 → P2 → H1 → F1/F2 → W1 → A1 → M1 → G1 (about 3.5 h including setup, with remote debugging via `chrome://inspect`).

### Gaps
- Pass thresholds marked "target" are the team's own; no published acceptance numbers exist for these.

---

## Source register (condensed)

| ID | Title | Org | Date | Type | URL |
|---|---|---|---|---|---|
| S1 | WebXR Mixed Reality Features | Meta | undated (stale re: Quest 3) | Official doc | https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/ |
| S2 | WebXR Hands | Meta | undated | Official doc | https://developers.meta.com/horizon/documentation/web/webxr-hands/ |
| S3 | Browser release notes | Meta | 2026-10-02 latest | Official | https://developers.meta.com/horizon/documentation/web/browser-release-notes/ |
| S4 | WebXR frame rate control | Meta | undated | Official | https://developers.meta.com/horizon/documentation/web/webxr-frames/ |
| S5 | WebXR FFR | Meta | undated | Official | https://developers.meta.com/horizon/documentation/web/webxr-ffr/ |
| S6 | WebXR Layers | Meta | undated | Official | https://developers.meta.com/horizon/documentation/web/webxr-layers/ |
| S7 | WebXR perf best practices / workflow | Meta | undated | Official | https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/ ; https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/ |
| S8 | Browser remote debugging | Meta | undated | Official | https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/ |
| S9 | IWSDK ch.01/02/09/10/11, concepts, AI | Meta | 2026 | Official | https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/ ; …/02-testing-experience/ ; …/09-native-scene-editor/ ; https://developers.meta.com/vr/documentation/iwsdk/guides/10-spatial-ui-uikitml/ ; …/11-scene-understanding/ ; https://developers.meta.com/horizon/documentation/iwsdk/concepts/grabbing/ ; https://developers.meta.com/horizon/documentation/iwsdk/ai/ |
| S10 | IWSDK v1.0 package page | Meta | 2026-09-24 | Official | https://developers.meta.com/vr/downloads/package/immersive-web-sdk/v1.0/ |
| S11 | facebook/immersive-web-sdk repo, issues #10, #44 | Meta (GitHub) | 2025–2026 | Primary | https://github.com/facebook/immersive-web-sdk ; /issues ; /issues/10 ; /issues/44 |
| S12 | npm @iwsdk/core, iwer | npm | 2026-10-01 / 2026-09-24 | Primary | https://registry.npmjs.org/@iwsdk/core ; https://registry.npmjs.org/iwer |
| S13 | IWER blog; @iwer/sem README | Meta / npm | 2024–2026 | Official / README | https://developers.meta.com/horizon/blog/immersive-web-emulation-runtime-iwer-webxr-meta-quest-developer/ ; https://cdn.jsdelivr.net/npm/@iwer/sem@2.3.0/README.md |
| S14 | Immersive Web Emulator (extension) | Meta | 2023–24 | Official blog / store | https://developers.meta.com/horizon/blog/webxr-development-immersive-web-emulator ; https://chromewebstore.google.com/detail/cgffilbpcibhmcfbgggfhfolhkfbhmik |
| S15 | Meta Quest Browser version table | Wikipedia | to 2024-12 | Tertiary | https://en.wikipedia.org/wiki/Meta_Quest_Browser |
| S16 | Quest Browser depth-based hit test | UploadVR | 2025-10-10 | Press | https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/ |
| S17 | W3C Hand Input ED; Anchors ED; Hit Test; semantic-labels registry | W3C IWWG | 2024-06-05; 2026-04-27 | Spec | https://immersive-web.github.io/webxr-hand-input/ ; https://immersive-web.github.io/anchors/ ; https://www.w3.org/TR/webxr-hit-test/ ; https://raw.githubusercontent.com/immersive-web/semantic-labels/master/labels.json |
| S18 | Quest 2 hand-tracking accuracy study | Goldsmiths (Abdlkarim et al.) | 2024 | Peer-reviewed | https://research.gold.ac.uk/id/eprint/36601 |
| S19 | Hands 2.2 blog | Meta | 2023 | Official blog | https://developers.meta.com/horizon/blog/hand-tracking-22-response-time-meta-quest-developers/ |
| S20 | three.js #22884; Babylon audio glitches; Babylon WebXR perf | Community | 2021–2026 | Forum/issue | https://github.com/mrdoob/three.js/issues/22884 ; https://forum.babylonjs.com/t/audio-glitches-in-vr/25673 ; https://forum.babylonjs.com/t/need-tips-on-performance-improvements-in-webxr-vr/63271 |
| S21 | VR Glasses announcement; FoV essentials; FoV simulation; device readiness; Connect recap | UploadVR / RoadToVR / Meta | 2026-09-24+ | Press / Official | https://www.uploadvr.com/meta-vr-glasses-officially-announced-connect-2026/ ; https://roadtovr.com/meta-vr-glasses-unveiled-price-release-date/ ; https://developers.meta.com/vr/essentials/field-of-view ; https://developers.meta.com/horizon/documentation/unity/in-headset-fov-simulation ; https://developers.meta.com/horizon/documentation/unity/device-readiness/ ; https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/ |
| S22 | Device optimization comparison; Quest 3S specs | Meta / iFixit | 2024–25 | Official / tertiary | https://developers.meta.com/horizon/resources/device-optimization-comparison/ ; https://ts.ifixit.com/Device/Meta_Quest_3S |
| S23 | GitHub Pages COOP/COEP discussion | GitHub Community | ongoing | Forum | https://github.com/orgs/community/discussions/13309 |
| S24 | Competition coverage | UploadVR / RoadToVR | 2026-09 | Press | https://www.uploadvr.com/meta-launches-1-million-competition-for-hands-first-apps-ahead-of-vr-glasses/ |

Reliability notes: Meta web docs are authoritative but several are stale (MR doc, AI tooling page shows 0.5.3). Wikipedia table is tertiary but cites Meta release notes. abratabia.com is a tutorial site (non-authoritative). Meta forum thread on 120 fps was inaccessible (HTTP 403).
