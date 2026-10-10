# Headset-free interactive / spatial / music-making experiences — what transfers to Roomsong, and does Roomsong genuinely need a headset?

Research date: 2026-10-10. Scope: verified headset-free precedents (web, webcam, mobile AR, screen 3D, installations), the feasibility of a non-XR mode in Roomsong's IWSDK/Three.js codebase, browser hand tracking as a Quest stand-in, evidence on spatial-vs-screen outcomes, headset-free entries in Meta competitions, and transferable web-toy techniques. Classification convention used throughout: **genuine AR** = live camera/passthrough with world-registered content; **3D simulation** = rendered 3D on a flat screen; **"immersive" marketing** = promotional label with no world registration or presence mechanism.

Note on the brief's constraint: the competition requires a hands-first Quest (or Meta VR Glasses) build ([Meta blog, 2026](https://developers.meta.com/horizon/blog/meta-connect-2026-vr-start-developer-competition/)). Everything below treats a headset-free mode as a **development/demo/companion** channel, not a substitute submission, unless stated otherwise.

---

## Key Question 0 (Objective): Comparison of verified headset-free examples and their applicability to Roomsong

### Takeaway
Thirteen examples were verified across six categories. None of the most successful music toys (Chrome Music Lab Song Maker, Incredibox, Patatap, Blob Opera) needed anything beyond a browser; their success came from instant sound, no-wrong-notes constraints, zero-text onboarding and link-based sharing — all of which are implementation patterns Roomsong can adopt in any mode. Genuine headset-free *AR* music-making with real evidence of success is rare; most "WebAR music" is marketing playback, not creation.

### Cited Findings

#### A. Standard web apps (no camera, no headset)

**1. Chrome Music Lab / Song Maker (Google Creative Lab, 2016/2018)** — 3D simulation? No: 2D web. Headset: no.
- Launched March 2016 by Google Creative Lab; built on Web Audio; experiments were open-sourced to teach music and code — [CDM](https://cdm.link/google-are-giving-away-experiments-to-teach-music-and-code/); [g.co/musiclab](https://g.co/musiclab)
- Song Maker: "make a song and share it with a link, with no need to log in or make an account ... anyone can instantly hear what you made and even riff on it"; works on phones, tablets, computers — [SA Dept. of Education page on Song Maker](https://www.education.sa.gov.au/our-learning-sa/learning-home-activities/arts/chrome-music-lab-song-maker)
- Campaign-claimed numbers (Cannes Lions case entry; treat as promotional claims, not audited): Chrome Music Lab "reached over 60 million users"; Song Maker "2.4 million visits across 1.2 million users (800k international)", "15.8 million views" — [WARC Cannes case](https://www.warc.com/content/article/cannes/google-chrome-music-lab--song-maker/126740); Cannes Lions entries exist at [LoveTheWork 606154](https://www.lovethework.com/work-awards/campaigns/chrome-music-lab-song-maker-606154) and [LoveTheWork 420932](https://www.lovethework.com/work-awards/campaigns/chrome-experiments-chrome-music-lab-song-maker-420932) (page body inaccessible; award level not verified)
- Independent evidence of adoption: peer-reviewed study using Song Maker as a music-learning medium (Journal of Innovation in Educational and Cultural Research, July 2023) — [DOAJ](https://doaj.org/article/2a5f91d282174c82952af25c8424c5ef); review "Breaking Barriers in Music Education with Chrome Music Lab" — [AMT Lab, CMU](https://amt-lab.org/reviews/2019/2/chrome-music-lab)
- Hardware truly required: any browser. Interactions: click/tap grid, scale restricted to a chosen key so there are no wrong notes (design observed on the live site; see g.co/musiclab).
- Applicability verdict for Roomsong: **directly transferable pattern** (grid sequencer, quantised scale, share-by-link, no login). Roomsong's 5 rings × 16 steps is structurally a Song Maker grid wrapped into a ring; a screen mode of Roomsong is essentially "Song Maker as a garden". Better or worse than headset: for *composition* a screen is equal or better (precision, overview); for *presence and the room* a screen cannot deliver.

**2. Patatap (Jono Brandel with Lullatone, March 2014)** — 2D web. Headset: no.
- "A portable animation and sound kit"; keyboard or touch across laptops, phones, tablets; switch palettes/soundscapes on the fly — [Google Experiments page](https://experiments.withgoogle.com/patatap)
- Collaboration with Japanese composers Lullatone; press at launch (XLR8R, Atlanta Black Star, Genbeta) — [XLR8R](https://xlr8r.com/?p=68498); [Atlanta Black Star 2014](https://atlantablackstar.com/2014/03/29/make-music-board-work-patatap/); [Lullatone](https://www.lullatone.com/?p=2090)
- Evidence of success is press + inclusion in Chrome Experiments; an FWA award was **not** verifiable (searches returned unrelated FWA results).
- Applicability: the "every input makes a satisfying sound+shape, zero instructions" rule is the strongest first-five-minutes pattern available. Roomsong's pinch-to-plant should produce sound and bloom **on the pinch**, not on the next tide pass.

**3. Incredibox (So Far So Good, 2009 web; app 2016)** — 2D web/app. Headset: no.
- Official press page: 106 million players of the free demo since 2009; 3.3 million app downloads; 3M+ sales across stores by Sept 2024; $4.99; awards include FWA Site of the Day 2009, Lovie Awards 2012, FWA Mobile of the Day 2016, AASL Best Apps 2018, Digital Ehon Grand Prize 2021 — [Incredibox press](https://www.incredibox.com/info/press) (self-reported). Wikipedia reports 2 million sales as of Jan 2023 — [Wikipedia](https://en.wikipedia.org/wiki/Incredibox)
- Interaction: drag a sound icon onto a character; every combination is pre-quantised so all mixes are musical; record and share a mix.
- Applicability: proof that **drag-to-assign + guaranteed-harmonic loops + shareable mix** sustains a decade of engagement without any spatial tech. Roomsong's "seed kinds" map to Incredibox sound slots.

**4. Blob Opera (David Li × Google Arts & Culture, Dec 2020)** — 3D simulation (WebGL blobs). Headset: no.
- ML model trained on 16 hours of recordings by four opera singers; drag blobs vertically for pitch, horizontally for vowel; record and share — [Google Arts & Culture](https://artsandculture.google.com/experiment/blob-opera/AAHWrq360NcGbw?cp=e30); [Google Experiments](https://experiments.withgoogle.com/blob-opera); press: [Billboard](https://www.billboard.com/?p=9500492), [Boing Boing](https://boingboing.net/2020/12/16/blob-opera-a-delightful-machine-learning-and-music-experiment.html/amp)
- Usage figures and awards: none found (gap).
- Applicability: harmonisation is automatic (the other three blobs follow the one you drag), so there is never a dissonant chord — a direct precedent for Roomsong's "room signature" choosing key/mode so every ring is consonant.

**5. Ableton Learning Music (May 2017)** — 2D web. Headset: no.
- Free browser-based interactive lessons on beats, melody, chords — [Engadget 2017-05-08](https://www.engadget.com/2017-05-08-ableton-interactive-lessons.html); [Mixmag](https://mixmag.net/amp/learn-music-production-basics-with-abletons-new-interactive-website)
- Usage numbers / awards: none found (gap).
- Applicability: "learn by poking, explanation after the sound" — supports a zero-text onboarding where captions follow actions.

**6. Seaquence (Gray Area residency Flash web app → Okaynokay iOS, 2017)** — 2D web/app. Headset: no.
- Compose by spawning and shaping lifeforms in a Petri dish; iOS app free with $6.99 unlock, 10% to Gray Area — [CDM](https://cdm.link/seaquence-lets-make-music-animated-ocean-creatures/); [Synthtopia 2017-03-14](https://synthtopia.com/content/2017/03/14/new-ios-app-seaquence-pairs-serious-synthesis-with-a-fun-interface); [Gray Area press](https://grayarea.org/press/seaquence-growin-groove-petri-dish/)
- Applicability: closest conceptual sibling (organisms = sequences; shape = melody). Shows the "garden of living sequencers" metaphor works on a flat screen; the headset adds *placement in your room*, not the metaphor.

**7. Tero Parviainen web-audio experiments** — no primary source was retrievable in this session (searches returned unrelated "In C" results). Not included in the verified set; see Gaps.

#### B. Webcam body/hand tracking in the browser (no headset)

**8. Semi-Conductor (Google Creative Lab Sydney, Dec 2018)** — webcam pose; not AR (no world registration). Headset: no.
- PoseNet in the browser maps arm movements to tempo, volume and instrumentation; "hundreds of tiny audio files"; all processing local; no longer active — [Google Experiments](https://experiments.withgoogle.com/semi-conductor); [TechRadar](https://techradar.com/news/googles-latest-ai-experiment-lets-you-conduct-an-orchestra-in-your-browser)
- Applicability: proves webcam gesture → musical parameter works for a 10-minute toy; it did **not** persist as a product (inactive), which suggests novelty-limited retention.

**9. Body Synth (Creatability, Oct 2018)** — webcam pose; accessibility-first. Headset: no.
- TensorFlow.js + Tone.js; body parts trigger notes; voice commands change chords/instruments; adjustable movement sensitivity — [Google Experiments](https://experiments.withgoogle.com/body-synth)
- Applicability: strong "Accessibility Forward" precedent — sensitivity scaling and voice/alternate control for users with limited mobility is directly relevant to Roomsong's seated/one-hand modes.

**10. Move Mirror (Google Creative Lab/PAIR, July 2018)** — webcam pose; 80,000-image match; no longer active — [Google Experiments](https://experiments.withgoogle.com/move-mirror). Not music, included only as evidence of PoseNet-in-browser maturity.

**11. Leap Motion / Ultraleap instruments (GECO MIDI, 2013→2023)** — dedicated IR sensor; no headset.
- GECO maps Leap gestures to MIDI/OSC; vendor claims "near zero latency"; v2 supports Ultraleap Gemini and Leap Motion Controller 2 — [CDM 2013](https://cdm.link/2013/04/from-gestures-to-midi-geco-promises-music-applications-for-leap-motion/); [CDM 2023](https://cdm.link/2023/07/geco-for-ultraleap/); [App Store](https://apps.apple.com/us/app/geco-midi-gesture-control/id6450132965?mt=12)
- Applicability: requires hardware the team does not have; not a fallback path. Relevant only as evidence that mid-air gesture instruments remain niche after a decade (inference from continued "promises"/hobbyist framing in press).

#### C. Mobile / camera AR (genuine AR, no headset)

**12. 8th Wall WebAR music activations (2019–2023)** — genuine camera AR, but *playback/marketing*, not music-making.
- Coldplay × BTS image-target album covers (arfected/Warner); Pink Floyd *The Later Years* (Sony/Draw & Code); Real Estate "Quarantour" "world's first WebAR concert"; Yellock WebAR clubbing — [8th Wall/Niantic blog Coldplay](https://info.nianticspatial.com/blog/coldplay-and-bts-bring-album-covers-to-life-with-webar); [Pink Floyd](https://info.nianticspatial.com/blog/pink-floyd-creates-surreal-webar-experience-for-the-later-years-album-release); [Real Estate](https://info.nianticspatial.com/blog/indie-rock-band-real-estate-is-the-worlds-first-musicians-to-launch-a-webar-concert); [Yellock](https://8thwall.com/mawari/yellock)
- All are vendor case studies (promotional); no engagement metrics given. Interactions are "scan and watch".
- Applicability: **not** a creative-play precedent. Classify as "immersive" marketing. Technique worth noting: no-app-install via browser, which Roomsong already has via WebXR.

**13. ARKit music apps** — genuine phone AR. Beatsy (AR music visualiser on any surface) — [iMore](https://www.imore.com/beatsy-turns-any-surface-ar-powered-music-visualizer); ARMusic (floating album art) — [Cult of Mac](https://www.cultofmac.com/494776/arkit-music-video-app/). No adoption numbers; both are visualisers, not instruments. Pok Pok Playroom won an Apple Design Award and later added a kids' music Sequencer — but that sequencer is 2D touch, not AR — [9to5Mac](https://viptest.9to5mac.com/2022/03/17/pok-pok-app-for-kids-gets-music-sequencer/).
- Applicability: no verified, successful phone-AR *instrument* was found. Phone AR fights the one-hand-holds-the-phone problem, which is fatal for a bimanual pinch instrument (inference).

#### D. Projection / physical installations (no headset)

**14. Reactable (UPF Barcelona, 2005; Golden Nica 2008)** — tangible tabletop, projection + fiducials.
- Prix Ars Electronica 2008 **Golden Nica**, Digital Musics; "luminous round table", glowing acrylic objects as building blocks, multiple simultaneous performers, "from children to professionals" — [Ars Electronica archive](https://webarchive.ars.electronica.art/en/archives/prix_archive/prix_projekt.asp%3FiProjectID=16333.html); Björk's Volta tour used it in ~80 concerts — [reactable.com](https://reactable.com/about-us/); [Wikipedia](https://en.wikipedia.org/wiki/Reactable)
- Applicability: the single most relevant precedent — a **round table** where object position and rotation are the instrument. Roomsong's ring bed on a real table is a hands-only Reactable. Its concentric-ring layout and "proximity = connection" are reusable spatial grammars.

**15. teamLab Borderless (Tokyo, 2018)** — projection, room-scale, no wearables.
- Guinness World Record: most visited museum for a single art group, 2,198,284 visitors in 2019 — [Time Out Tokyo](https://www.timeout.com/tokyo/news/teamlab-borderless-takes-guinness-world-record-for-the-worlds-most-visited-museum-071421); [teamLab press](https://teamlab.art/press/timeout210714); [Guinness](https://www.guinnessworldrecords.de/world-records/589898-most-visited-museum-single-art-group)
- Applicability: evidence that "the room reacts to you" has mass appeal without headsets — but the hardware (projectors, buildings) is not reproducible; the transferable idea is *content that acknowledges the body and the surface*.

**16. Daito Manabe / Rhizomatiks with Nosaj Thing** — stage AV performance.
- Prix Ars Electronica Award of Distinction (Interactive Art) 2011; Nosaj Thing sets at Coachella 2016 and Sónar 2017 — [daito.ws biography](https://daito.ws/en/archive/biography/); [Rhizomatiks Sónar](https://rhizomatiks.com/en/work/daito-nosaj-sonar-barcelona)
- Applicability: performance-grade tracking/projection; not relevant to a seated consumer toy beyond "light follows sound" aesthetics.

#### Summary table

| # | Example | Category | Genuine AR? | Hardware truly required | Headset? | Evidence of success (type) | Reusable technique | vs. headset for Roomsong |
|---|---|---|---|---|---|---|---|---|
| 1 | Song Maker | Web app | No (2D) | Browser | No | Campaign numbers (60M claimed); peer-reviewed classroom use | Quantised grid, share-by-link, no login | Better for composing; worse for presence |
| 2 | Patatap | Web app | No | Browser | No | Press; Chrome Experiments | Instant sound+shape per input, zero text | Equal for first-touch delight |
| 3 | Incredibox | Web/app | No | Browser/phone | No | 106M players, 3M+ sales (self-reported); FWA/Lovie | Drag-to-assign, pre-harmonised loops, record mix | Equal/better for loops; no room |
| 4 | Blob Opera | 3D sim | No | Browser (WebGL) | No | Major press; no numbers | Auto-harmonisation, record/share | Equal for "no wrong notes" |
| 5 | Ableton Learning Music | Web app | No | Browser | No | Press; no numbers | Explain-after-sound onboarding | n/a |
| 6 | Seaquence | Web/app | No | Browser/iOS | No | Press; Gray Area | Living organisms = sequences | Metaphor works flat; headset adds placement |
| 8 | Semi-Conductor | Webcam | No | Webcam | No | Press; now inactive | Body gesture → tempo/volume | Novelty; inactive |
| 9 | Body Synth | Webcam | No | Webcam | No | Creatability collection | Sensitivity scaling, voice control (a11y) | Accessibility pattern transferable |
| 11 | GECO/Leap | IR sensor | No | Leap device | No | Niche adoption | Mid-air gesture → MIDI | Needs hardware we lack |
| 12 | 8th Wall music WebAR | Phone AR | Yes | Phone camera | No | Vendor case studies only | No-install camera AR | Playback only; not creative |
| 13 | ARKit music apps | Phone AR | Yes | iPhone | No | Press; no numbers | Surface-anchored visuals | One hand on phone kills bimanual pinch |
| 14 | Reactable | Tangible table | No (projection) | Custom table | No | Golden Nica 2008; Björk tour | Round-table spatial grammar | Closest ancestor; our version needs headset for "no table hardware" |
| 15 | teamLab Borderless | Projection | No | Building | No | Guinness 2.2M visitors/yr | Room reacts to body | Not reproducible |
| 16 | Manabe/Nosaj Thing | Stage AV | No | Stage rig | No | Ars Electronica distinction | Light follows sound | Aesthetic only |

### Inferences
- The four web toys with the strongest evidence (Song Maker, Incredibox, Patatap, Blob Opera) share four properties: sound on first input, impossible-to-be-wrong harmony, no instructions, and a one-link share. None depends on spatial hardware. These are judged under "First Five Minutes" and "Experience Design" and cost nothing to port into Roomsong.
- Headset-free *genuine AR* music-making with evidence of success was not found; phone AR music is passive playback. Roomsong's category (hands-first MR instrument) therefore has few direct competitors headset-free, but also no proof that phone AR is a viable companion.
- Reactable is the design ancestor; its 2008 Golden Nica and touring use show that a round-table, position-is-music instrument is compelling to both children and professionals.

### Gaps
- Tero Parviainen's experiments: no retrievable primary source this session.
- Patatap FWA award, Blob Opera usage/awards, Ableton Learning Music traffic: not found.
- Song Maker numbers are from a Cannes case entry (promotional); no independent audit found.
- No example in the brief's "Tónandi-like spatial audio on screen" category could be verified with success evidence; three.js music visualisers exist in abundance but none with citable adoption data was found.

---

## Key Question 1: Can a headset-free "non-XR mode" live in the same IWSDK/three.js codebase, and how do IWSDK/three.js handle "no XR"?

### Takeaway
Yes, with low-to-moderate effort: IWSDK already auto-injects the IWER emulator on localhost (mouse/keyboard + emulated hands with pinch values), and three.js renders the same scene to a normal canvas when no session is active. The genuinely missing piece is **AR scene understanding** (planes/meshes/anchors), which the fetched IWSDK/IWER docs do not emulate — so the non-XR mode must mock the table.

### Cited Findings
- IWSDK README: the framework lets apps "run immersively in VR/AR headsets and automatically provide mouse-and-keyboard emulation on desktop browsers"; input package `@iwsdk/xr-input` supports hands, controllers, pointer — [GitHub facebook/immersive-web-sdk](https://github.com/facebook/immersive-web-sdk)
- IWSDK testing guide: IWER "runs entirely in your browser, allowing you to develop and test WebXR applications without a headset"; injected by the `iwsdkDev` Vite plugin; **activates automatically on localhost**, stays disabled on IP-address access (assumes a real headset), with a user-agent guard against activating on a headset over ADB forwarding — [Meta IWSDK testing guide](https://developers.meta.com/horizon/documentation/web/iwsdk-guide-testing-experience/)
- IWER getting started: `new XRDevice(metaQuest3); xrDevice.installRuntime()`; head pose via `xrDevice.position/quaternion`; controllers via `updateButtonValue`, `updateAxes`; hands via `xrDevice.hands['left'].poseId = 'relaxed'` and `leftHand.updatePinchValue(pinchVal)`; "action capture and playback" for automated tests — [IWER getting started](https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html); [IWER home](https://meta-quest.github.io/immersive-web-emulation-runtime/)
- IWSDK scene understanding config is declared at world creation: `World.create(container, { xr: { sessionMode: SessionMode.ImmersiveAR, features: { planeDetection: true, meshDetection: true, anchors: true } } })`; "not all WebXR implementations support all features ... The system will log warnings for unsupported features"; no explicit fallback is documented — [Meta IWSDK scene understanding guide](https://developers.meta.com/horizon/documentation/web/iwsdk-guide-scene-understanding/)
- IWER docs fetched this session do **not** describe plane/mesh/anchor emulation — [IWER getting started](https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html)
- three.js `ARButton` behaviour without XR: no `navigator.xr` → "WEBXR NOT AVAILABLE" link to immersiveweb.dev; not secure context → "WEBXR NEEDS HTTPS"; `isSessionSupported('immersive-ar')` false → "AR NOT SUPPORTED" (button disabled); exception → "AR NOT ALLOWED" — [three.js ARButton.js source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/webxr/ARButton.js)
- Meta's 2026 competition blog: "You can build in Unity, Unreal, a native engine, or with Android and web" — [Meta blog](https://developers.meta.com/horizon/blog/meta-connect-2026-vr-start-developer-competition/)

### Inferences
- Architecture that works with these facts (hypothesis, consistent with the docs): keep **one scene graph and one garden/audio model**; add an `InputSource` abstraction with three implementations — (a) XR hands (IWSDK), (b) IWER-emulated hands (already free on localhost), (c) a pointer/touch raycaster for a true non-XR mode outside localhost. The ring bed is placed by a `PlacementSolver` whose "no XR planes" branch spawns a virtual table at a fixed height in front of an OrbitControls/fixed camera.
- The mode split should be keyed on `navigator.xr?.isSessionSupported('immersive-ar')` at startup (the exact check three.js ARButton performs): true → offer "Enter room"; false → render the same world to the canvas with a 2D-friendly camera. This is the same pattern as ARButton's fallback branches, just with a playable fallback instead of a disabled button.
- Realistic effort (hypothesis, not measured): pointer raycast + virtual table + camera rig ≈ 1–3 developer-days on top of the existing scene; optional webcam-hand cursor via MediaPipe ≈ 2–4 additional days (see KQ2); mobile touch layout and share page ≈ 1–2 days. The expensive parts (audio engine, garden rules, growth, tide, persistence) are shared.
- Risk: IWER's localhost-only activation means a deployed static build on an IP/URL will have **no emulation** — so the non-XR mode must be a real code path, not reliance on IWER, if the team wants public demos or a judge-facing "watch it on your laptop" page.
- What a non-XR mode cannot validate: passthrough legibility, FoV-aware layout, real-table occlusion, Quest frame budget (72 fps), and real hand-tracking jitter.

### Gaps
- Whether IWER provides a Synthetic Environment Module for planes/meshes was not confirmed in the fetched pages (the IWER site mentions only input remapping and action capture/playback); verify against the IWER API reference before relying on emulated planes.
- IWSDK's behaviour when `World.create` is called with `ImmersiveAR` on a browser with no XR at all (does it throw, or render inline?) is not documented in the fetched pages; needs a 30-minute PoC.
- Whether a "web" entry in the 2026 competition can be a 2D PWA rather than an immersive WebXR app could not be verified: the Devpost rules page returned HTTP 403 twice in this session.

---

## Key Question 2: Browser hand tracking without a headset (MediaPipe / TF.js handpose) — accuracy, latency, pinch reliability, CPU cost; can it stand in for Quest hands?

### Takeaway
MediaPipe Hand Landmarker is fast enough on a laptop (≈48–62 FPS full/lite in the browser on a 2019 MacBook Pro; 12–17 ms on Pixel 6) and accurate to ~1.3 cm 3D error on a benchmark dataset, so it can drive a pinch cursor for *gesture-logic* development. It cannot substitute for Quest tracking on depth, camera viewpoint, two-hand occlusion over a table, or latency profile — so it should be used to tune state machines and audio response, not thresholds.

### Cited Findings
- Official MediaPipe Hand Landmarker: 21 hand-knuckle landmarks; outputs image-space and **world** landmarks; modes IMAGE / VIDEO / LIVE_STREAM; defaults `min_hand_detection_confidence`, `min_hand_presence_confidence`, `min_tracking_confidence` = 0.5; model input 192×192 / 224×224, float16; benchmark on Pixel 6: **17.12 ms CPU, 12.27 ms GPU** (full model); Web/JS supported with code example — [MediaPipe Hand Landmarker docs](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker)
- TensorFlow.js/MediaPipe 3D handpose (Nov 2021) browser benchmarks, FPS lite/full: MacBook Pro 15" 2019 **62/48** (MediaPipe runtime), 36/31 (TF.js runtime); iPhone 11 8/5 (MediaPipe), 15/12 (TF.js); Pixel 5 19/15 (MediaPipe), 11/8 (TF.js); desktop i9-10900K + GTX 1070 136/120 (MediaPipe). Accuracy on an ASL dataset: 2D mAP 79.2% (lite) / 83.8% (full); **3D error 1.4 cm / 1.3 cm**; both hands simultaneously; handedness output — [TensorFlow blog, 3D Hand Pose](https://blog.tensorflow.org/2021/11/3D-handpose.html)
- Google's own webcam music experiments ran pose (not hand) models fully client-side: Semi-Conductor (PoseNet, arm movement → tempo/volume) and Body Synth (TensorFlow.js + Tone.js) — [Semi-Conductor](https://experiments.withgoogle.com/semi-conductor); [Body Synth](https://experiments.withgoogle.com/body-synth)
- Quest reference point: Hands 2.2 (v56) claims "up to 40% latency reduction in typical usage and up to 75% during fast movement" via Fast Motion Mode — [Meta developer blog, Hands 2.2](https://developers.meta.com/vr/blog/hand-tracking-22-response-time-meta-quest-developers/); press framed it as "almost as responsive as controllers" — [Road to VR](https://roadtovr.com/?p=171737)
- No official MediaPipe document fetched this session reports a pinch-detection accuracy figure; pinch is not among the metrics in the docs or blog above.

### Inferences
- Pinch must be derived (thumb-tip to index-tip distance, normalised by hand scale, with hysteresis) because the Hand Landmarker outputs landmarks, not a pinch event; this is the same computation IWER exposes as `updatePinchValue`, so a shared `pinchStrength → pinchState` state machine can be tested with both inputs.
- Where webcam tracking would **mislead** Roomsong (inferences from the facts above):
  1. **Depth/scale**: monocular world landmarks have ~1.3 cm error on a curated dataset and worse in uncontrolled lighting; Roomsong's ring bed spans 0.12–0.30 m with 16 steps per ring, i.e. steps a few cm apart — webcam depth is not reliable enough to pick a ring by hand height.
  2. **Viewpoint**: a laptop webcam looks at the user's face; Quest cameras look down at the table from the head. Hand poses that are visible to one are occluded to the other (pinch with fingertips facing the table is hidden from a front webcam). Thresholds tuned on a webcam will not transfer.
  3. **Latency profile**: webcam capture (typically 30 fps) + 12–20 ms inference + render is a different pipeline from Quest's on-device tracking; audio-reaction timing tuned on webcam will feel different on Quest.
  4. **Self-view**: on Quest the user sees their real hands in passthrough; on webcam they see a mirrored cursor. Any "the hand itself is the UI" affordance cannot be evaluated.
  5. **Two-hand overlap**: both hands over a small ring area will cross and occlude from a single camera; Quest has multiple cameras and a hand model trained for that view.
- What it is **good** for: tuning the gesture *grammar* (pinch → plant, hold → grow, drag → move, drag-off → remove), the audio feedback loop, caption timing, and regression tests via IWER's action capture/playback — all things judged under Experience Design and Technical Implementation.
- CPU budget on a MacBook (≈48 FPS full model) is comfortable; on phones (5–15 FPS on iPhone 11/Pixel 5) a webcam-hand mobile mode is not viable for a rhythm toy.

### Gaps
- No peer-reviewed or vendor figure on MediaPipe pinch detection precision/recall in the browser was found.
- No published latency measurement for Quest 3 hand tracking in absolute milliseconds was retrieved (Meta gives relative improvements only).
- Benchmarks are 2021 (TF blog) and Pixel 6-era (docs); current laptops will be faster, but no newer official table was found.

---

## Key Question 3: Does spatial/MR measurably beat screen versions for creative/music play — or is "the room matters" mostly novelty?

### Takeaway
The evidence is mixed and domain-dependent: immersion reliably raises **presence, stimulation and engagement** (and, for music listening, emotional response via presence), but it can **reduce precision and learning outcomes** and raise cognitive load. For Roomsong, this supports leading with presence/engagement and emotional payoff while keeping the composition mechanics simple and error-proof — and it means "the room matters" must be *designed* (room signature, surfaces making notes), not assumed.

### Cited Findings
- Abdou et al. (CLLE, 2024, Springer chapter): VR headset vs laptop screen while listening to film-music excerpts; presence (Makransky Multimodal Presence Scale) "significantly predicts musical emotions and **fully mediates** the relationship between immersion and musical emotions" — [CLLE, Université Toulouse](https://clle.univ-tlse2.fr/accueil/the-mediating-effect-of-presence-on-musical-emotions-in-virtual-environments)
- Makransky, Terkildsen & Mayer (2019, *Learning and Instruction*): 52 students, 2×2 (desktop vs HMD × text vs narration); VR produced **more presence but less learning** and significantly higher EEG-measured cognitive load — [KU publication record](https://test01.ku.dk/:obvius/pureproxy/3974268/en/publications/adding-immersive-virtual-reality-to-a-science-lab-simulation-caus); [iMotions summary](https://imotions.com/blog/adding-immersive-virtual-reality-to-a-science-lab-simulation-causes-more-presence-but-less-learning)
- Houzangbe et al. (2022, *Frontiers in Virtual Reality*): n=60, VR 3D sketching (HTC Vive Pro Eye) vs 2D interactive whiteboard, divergent + convergent creativity tasks; VR: more features per idea (9.74 vs 7.80, p=0.009), higher stimulation (AttrakDiff 1.56 vs 1.10, p=0.008), higher engagement (CSI 9.30 vs 8.57, p=0.011), significant valence increase (p=0.006); **2D produced more unique features per idea**; authors recommend combining VR exploration with 2D precision — [Frontiers in VR](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2022.958223/full)
- A randomized study with design students (immersive VR vs PC, fNIRS + NASA-TLX, expert-rated outputs) reports VR "significantly enhanced design outcomes' novelty", non-immersive better for "refining and finalizing", and VR "associated with increased physical demand and perceived task difficulty" — [iLRN publication (abstract-level only)](https://publications.immersivelrn.org/index.php/academic/article/view/1123)
- Wang et al. (NIME 2023): freehand hand-tracked AR musical interface, N=20 musicians; "highly learnable and explorable"; "mobility, space and sound" deliver "an engaging and playful musical experience"; **no non-AR control condition**; authors note "we are yet to see widespread adoption of head-mounted AR musical instruments" — [NIME 2023 paper 17](https://nime.org/proc/nime2023_17/)
- ARCube (NIME 2025): AR spatial-audio controller tested across 12 instruments; challenges in two-handed playing, gesture recognition accuracy and cube stability; no screen comparison — [NIME 2025 paper 78](https://nime.org/proc/nime2025_78/)
- NIME 2020 "Exploring the Affordances of VR for Musical Interaction Design with VIMEs" exists as a design-space contribution (not a controlled comparison) — [NIME 2020 paper 23](https://nime.org/proc/nime2020_23/)
- Reactable (tangible table, no headset) won the 2008 Golden Nica and toured with Björk — evidence that *spatial, tabletop* music-making can be compelling without immersion at all — [Ars Electronica archive](https://webarchive.ars.electronica.art/en/archives/prix_archive/prix_projekt.asp%3FiProjectID=16333.html)

### Inferences
- The converging pattern across the music-listening, learning and creativity studies: immersion → more presence/engagement/affect; immersion → worse detail work and higher load. Roomsong is a *play* toy, not a precision DAW, so the trade-off favours MR — provided interactions require no precision (quantised rings, generous targets, no-wrong-notes).
- No study found compares an MR (passthrough) music toy against its own screen version. The honest claim for the Devpost text is "immersion increases presence and engagement in creative tasks (citations above)", not "our MR version is proven better".
- "The room matters" is only true if the room *does* something. Room signature (geometry → key/tempo/reverb; ripple showing which surface made which note) is exactly the mechanism that converts passthrough from novelty into a cause of musical outcomes; without it, the studies suggest the screen version would compete on composition quality.
- Novelty risk is real: Semi-Conductor and Move Mirror are both inactive today; a wow-moment without a retention loop (daily seed, growth, save) fades.

### Gaps
- No controlled MR-vs-screen study on music *creation* (as opposed to listening or sketching) was found.
- The Abdou et al. sample size and statistics were not visible on the fetched page.
- The iLRN design-student study was only available as a search abstract; author list and journal were not confirmed.

---

## Key Question 4: What did headset-free entries look like in Meta's own competitions, and did any win?

### Takeaway
No headset-free (2D/panel/PWA) winner of a Meta developer competition was found. Meta's hackathons required a core MR capability plus a Presence Platform SDK, and all documented winners were immersive MR apps; 2D apps on the Horizon Store are a distribution channel (since Connect 2024), not a contest category.

### Cited Findings
- 2024 Presence Platform Digital Hackathon: 2,000+ participants, $30K prizes; submissions had to include "at least one core MR capability (e.g. Passthrough, Scene, Spatial Anchors, Mesh, or Depth) and one Presence Platform SDK"; winners Blobble (Scene, Interaction SDK), Flaivor (Passthrough + OpenAI + Voice SDK), Dreamscape (Passthrough, Hand Tracking, Interaction SDK, OpenAI, Voice SDK) — all immersive MR — [Meta developer blog](https://developers.meta.com/horizon/blog/presence-platform-2024-digital-hackathon-winners-meta-quest/); [MIXED](https://mixed-news.com/en/meta-quest-presence-platform-hackathon-2024-best-submissions/)
- 2023 Presence Platform Hackathon (in-person, Quest Pro, 150+ applicants): winners "The Digital Wardrobe" and "SUBMERSED", both MR — [Meta blog](https://developers.meta.com/horizon/blog/announcing-our-presence-platform-hackathon-results); [MIXED](https://mixed-news.com/en/meta-presence-platform-hackathon-2023-winners/)
- Horizon Store accepts 2D apps built as PWAs, Android native, or via Meta Spatial SDK (announced Connect 2024); 2D apps appear as resizable panels; "3D PWAs with support for packaging 2D PWAs coming soon" — [Meta blog, 2D apps on Horizon Store](https://developers.meta.com/horizon/blog/building-2d-apps-on-the-meta-horizon-store); [UploadVR](https://uploadvr.com/quests-meta-horizon-store-now-accepts-2d-android-apps); [MIXED](https://mixed-news.com/en/meta-quest-2d-apps-horizon-store-meta-spatial-sdk/)
- 2026 VR Start Developer Competition: "hands-first" Quest and VR Glasses apps; seated-optimised; satisfying in ≤10 minutes; "build in Unity, Unreal, a native engine, or with Android and web"; $1M total, prizes $20K–$100K — [Meta blog](https://developers.meta.com/horizon/blog/meta-connect-2026-vr-start-developer-competition/); [UploadVR](https://www.uploadvr.com/meta-launches-1-million-competition-for-hands-first-apps-ahead-of-vr-glasses/); [Road to VR](https://roadtovr.com/?p=232601)

### Inferences
- A 2D panel/PWA entry would run on Quest without passthrough or hand-anchored interaction; it is hard to see how it could satisfy "hands-first" beyond pointer-pinch on a panel, and it would forfeit "purposeful passthrough" and FoV guidelines. It is not a competitive path.
- The "Android and web" wording does, however, suggest that a WebXR app served from a URL (Roomsong's plan) is an accepted build type; the non-XR web mode is then a *bonus surface* (judges' laptops, social sharing), not the entry.
- Winners' pattern (Blobble, Dreamscape): a simple core loop that uses one or two MR capabilities *purposefully* (room geometry, hand tracking). Roomsong's table placement + room signature fits that pattern.

### Gaps
- Devpost official rules for the 2026 competition could not be fetched (HTTP 403); the eligibility of a 2D panel app, and the exact definition of "hands-first", are unverified here and should be read from the Devpost rules page in a browser.
- No evidence of any 2D/PWA entry in any Meta hackathon could be found either way (absence of evidence, not evidence of absence).

---

## Key Question 5: Which techniques from the best web music toys transfer directly to Roomsong?

### Takeaway
Five techniques recur across every successful example and are platform-independent: sound on first input, quantised "no wrong notes" harmony, zero-text onboarding with explanation after the sound, a one-link shareable artefact, and constraints that make every combination musical. Each maps to a specific Roomsong mechanic and to a judging criterion.

### Cited Findings
- Instant sound/visual per input (Patatap: keyboard/touch → sound + animation, no instructions) — [Google Experiments](https://experiments.withgoogle.com/patatap)
- Quantised, key-locked grid and link sharing with no account (Song Maker) — [SA Education page](https://www.education.sa.gov.au/our-learning-sa/learning-home-activities/arts/chrome-music-lab-song-maker); [g.co/musiclab](https://g.co/musiclab)
- Pre-harmonised loops and recordable mixes (Incredibox; 106M players self-reported) — [Incredibox press](https://www.incredibox.com/info/press)
- Automatic harmonisation and record/share (Blob Opera) — [Google Arts & Culture](https://artsandculture.google.com/experiment/blob-opera/AAHWrq360NcGbw?cp=e30)
- Explanation after interaction (Ableton Learning Music interactive lessons) — [Engadget](https://www.engadget.com/2017-05-08-ableton-interactive-lessons.html)
- Sensitivity scaling and voice commands for accessibility (Body Synth, Creatability) — [Google Experiments](https://experiments.withgoogle.com/body-synth)
- Living-organism metaphor for sequences (Seaquence) — [CDM](https://cdm.link/seaquence-lets-make-music-animated-ocean-creatures/)
- Round-table, proximity-as-connection, children-to-professionals usability (Reactable, Golden Nica jury text) — [Ars Electronica archive](https://webarchive.ars.electronica.art/en/archives/prix_archive/prix_projekt.asp%3FiProjectID=16333.html)

### Inferences (mapping to Roomsong)
| Technique | Roomsong mechanic | Judging criterion / special award |
|---|---|---|
| Sound + bloom on the pinch itself (not only on tide pass) | Plant = immediate note preview + sprout | First Five Minutes |
| Rings fixed to a scale/mode chosen by room signature | 5 pitch rings, no dissonant plant possible | Experience Design; Boldest Original Concept |
| Zero text; caption appears after the first successful pinch | Onboarding state machine | First Five Minutes; Accessibility Forward |
| One-link share of the garden (seed string + ring state) | Local save + daily seed → encode as URL; non-XR web mode renders it | Reason to Come Back; Social |
| Every combination is musical (Incredibox) | Tide quantises timing; seed kinds are timbres, not pitches | Polish |
| Sensitivity scaling / one-hand / dwell | Access modes | Accessibility Forward |
| Round table grammar (Reactable) | Ring bed, distance from centre = pitch | Innovation |

- The share link is the natural bridge between modes: a garden made in the headset can be opened on a phone/laptop in the non-XR renderer (same scene graph, pointer camera), which is a cheap "Reason to Come Back"/social hook that no Meta hackathon winner above had.

### Gaps
- No quantitative study isolating which of these techniques drives retention (all evidence is adoption-level, not A/B).

---

## Key Question 6 (synthesis): Does Roomsong's core value genuinely need a headset, and what should the headset-free companion/fallback be?

### Takeaway
Roomsong's **musical** value (garden-sequencer loop, growth, tide, daily seed, no-wrong-notes) does not need a headset — Song Maker, Incredibox and Seaquence prove that loop on a screen. Its **differentiating** value (real table, free bimanual pinch in 3D, room geometry shaping the music) does need passthrough + hand tracking; nothing headset-free found in this research delivers that credibly for a consumer. The right structure is one codebase, two surfaces: the Quest MR build as the entry, and a non-XR "garden window" as the development bench, demo page and share target.

### Cited Findings
- Headset-free music toys with the strongest evidence are all screen-based with no spatial component (KQ0: Song Maker, Incredibox, Patatap, Blob Opera) — sources as above.
- Immersion raises presence/engagement/affect but lowers precision and learning; presence mediates musical emotion (KQ3: [Frontiers 2022](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2022.958223/full); [Makransky 2019](https://imotions.com/blog/adding-immersive-virtual-reality-to-a-science-lab-simulation-causes-more-presence-but-less-learning); [Abdou 2024](https://clle.univ-tlse2.fr/accueil/the-mediating-effect-of-presence-on-musical-emotions-in-virtual-environments))
- IWSDK gives mouse/keyboard emulation on desktop and IWER hand/pinch emulation on localhost (KQ1: [Meta testing guide](https://developers.meta.com/horizon/documentation/web/iwsdk-guide-testing-experience/); [IWER](https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html))
- MediaPipe hands run at 48–62 FPS in a laptop browser with ~1.3 cm 3D error (KQ2: [TensorFlow blog](https://blog.tensorflow.org/2021/11/3D-handpose.html))
- Meta competitions have only rewarded immersive MR entries (KQ4: [2024 winners](https://developers.meta.com/horizon/blog/presence-platform-2024-digital-hackathon-winners-meta-quest/))

### Inferences — recommended headset-free companion ("Roomsong Window"), ranked by value/effort (hypotheses)
1. **Non-XR renderer in the same build (must)** — same World/scene, pointer/touch raycast replaces pinch, fixed virtual table, orbit or top-down camera; gated by `isSessionSupported('immersive-ar')`. Purpose: daily development without a headset, Playwright/IWER regression, judge-facing web demo, share-link viewer. Effort ≈ 1–3 dev-days beyond the XR build.
2. **IWER-driven gesture tests (must, nearly free)** — use `updatePinchValue` + action capture/playback to script plant/grow/move/remove sequences and assert audio/garden state.
3. **Webcam-hand "cursor" mode via MediaPipe (should, dev-only)** — thumb–index pinch → pinch state; use only for gesture-grammar and audio-feedback tuning; never for threshold or depth calibration (KQ2 caveats). Effort ≈ 2–4 dev-days.
4. **Share page (should)** — URL-encoded garden rendered by (1) on phone/laptop; feeds "Reason to Come Back" and Social awards.
5. **Phone WebXR `immersive-ar` on Android Chrome (could, validate first)** — would reuse the `ImmersiveAR` session path with touch instead of hands; not verified this session, and one hand holds the phone, so it cannot demonstrate hands-first. Do not build before the Quest build is stable.
6. **2D panel/PWA Quest app (should not)** — no evidence it can win and it discards passthrough/hands (KQ4).

Honest risk statement for the team: with no headset on hand as of 2026-10-10, everything in (1)–(4) can proceed, but **FoV layout, passthrough legibility, real hand jitter over a real table, and the 60–72 fps budget cannot be validated without a Quest**; the room-signature feature (plane/mesh → music) has no documented emulation path and is therefore the highest-risk feature to leave untested until a headset arrives.

### Gaps
- Whether IWSDK's `World.create` with `ImmersiveAR` degrades gracefully on a non-XR browser (needs a PoC).
- IWER synthetic planes/meshes availability (needs IWER API reference check).
- Devpost rules text for the 2026 competition (HTTP 403 in this session).
- No controlled study of MR vs screen for music creation exists in the sources found; any "MR is better" claim must be framed as engagement/presence evidence, not outcome evidence.
