# Interaction and audio design evidence (Roomsong, hands-only seated table-scale MR + generative Web Audio)

Scope: evidence base for (A) hands-only, seated, table-scale interaction on Meta Quest and (B) "no-wrong-notes" generative music plus Web Audio synthesis/performance, including room-to-music mapping. Research date 2026-10-10. Every number carries a source link; where sources conflict both are shown and a provisional value is recommended for the pinch test. Items that could not be sourced are listed under Gaps, not asserted.

Method note: ~45 web searches/fetches. Three PDFs (Hansen et al. 2018, Shi et al. 2023, Schneider et al. 2021) were downloaded and text-extracted locally with macOS PDFKit because the fetch tool could not read them directly. Apple's visionOS HIG pages, the Springer button-size paper and the Chromium issue tracker could not be fetched (login/403), and Huron's voice-leading paper host did not resolve; these are flagged as gaps. The per-turn web-search budget was exhausted near the end, so two late queries (head-gaze dwell without eye tracking; Huron voice-leading principles) could not be run.

Geometry used throughout (derived from the brief, not a source): ring bed radii 0.12–0.30 m, 5 rings × 16 steps. Step pitch along a ring = 2πr/16 = 0.393·r → 4.7 cm on the inner ring (r = 0.12 m), 11.8 cm on the outer ring (r = 0.30 m). Radial ring spacing with 5 rings spanning 0.12–0.30 m = 4.5 cm. Visual angle of a target of width w at distance d = 2·atan(w/2d): 2.5 cm at 0.40 m ≈ 3.6°; 2.0 cm at 0.40 m ≈ 2.9°; 4.5 cm at 0.40 m ≈ 6.4°. Outer ring edge at r = 0.30 m seen from 0.40 m ahead subtends atan(0.30/0.40) ≈ 37° off-axis.

---

## KQ1. What target size (cm) and spacing should 5 rings × 16 steps on a 0.12–0.30 m ring use for ≥90% first-try pinch success at ~0.4 m, and which sources support it?

### Takeaway
Platform guidance converges on a minimum of roughly 2–3 cm (≈2–3° at 0.4–0.45 m) for direct hand targets, while measured Quest fingertip error (≈1–1.7 cm mean, with ≈1 cm jitter on Quest 3) argues for larger effective hit regions. The ring geometry already gives ≥4.5 cm cell pitch, so the provisional design is a 2.5 cm visible seed target with a hit region that fills most of the cell (3.5–4.0 cm, nearest-cell snapping, ≥0.5 cm dead band between cells) — to be validated in the pinch test.

### Cited Findings
Platform/vendor target-size guidance
- Microsoft MRTK: minimum target for direct hand interaction is 1.6 × 1.6 cm at 45 cm (no smaller than 2° of visual angle); for hand-ray or gaze interaction, 3.5 × 3.5 cm at 2 m (no smaller than 1°) — [Microsoft Learn, Interactable object](https://learn.microsoft.com/en-us/windows/mixed-reality/design/interactable-object)
- Microsoft's pressable button guidance (search summary): buttons for direct interaction should be ≥3.2 × 3.2 cm at 45 cm to fit an icon and text — [Microsoft Learn, Button](https://learn.microsoft.com/en-ie/windows/mixed-reality/design/button) (page not fetched; from search snippet)
- Meta Horizon OS hit targets: "a minimum of 48dp x 48dp" for interactive elements; "For all primary controls, maintain a minimum hit target of 60x60 dp to make them hand tracking accessible"; "Hand tracking has less precision than controllers"; use "invisible hit slop" beyond the visible element; ensure adjacent hit targets don't overlap; "It is critical to test your hit target sizes on an actual Meta VR device" — [Meta, Styles: inputs & hit targets](https://developers.meta.com/horizon/design/styles_inputs_hit_targets/)
- Meta accessibility checklist: interactive elements minimum 48dp × 48dp hit target; visual target ≥32dp × 32dp — [Meta, Accessibility checklist](https://developers.meta.com/horizon/design/accessibility-checklist/)
- Meta eyes best practices (new eye-tracked devices; also a sensible floor for head-gaze): "Size gaze targets to at least 3.0 degrees of visual angle"; world-size formula `2 x distance x tan(1.5 degrees)` ≈ 5.2 cm at 1 m; web content "at least 56 x 56 CSS pixels"; centre of a surface is most reliable; avoid dense groups and perimeter placement — [Meta, Eyes best practices](https://developers.meta.com/horizon/design/eyes-best-practices/)
- A third-party VR UI guide (secondary source) states comfortable hit targets should be ≥22 mm × 22 mm / 48 dp × 48 dp / 3° FoV at 0.42 m — [Medium, VR UI Design Guide](https://medium.com/@reclowill/vr-ui-design-guide-52c5a6510386). The 48 dp and 3° figures match Meta's own pages above; the 22 mm/0.42 m conversion is the author's.
- Ultraleap: buttons for direct interaction "should be no smaller than 2cm across", raised slightly off the surface; leave enough space around each component so the expected interaction does not accidentally trigger neighbours (no number given) — [Ultraleap XR guidelines, UI components](https://docs.ultraleap.com/xr-guidelines/Components/ui-components.html)
- Apple visionOS HIG (secondary summary; primary pages returned no content to the fetch tool): minimum interactive target 60 points, because eye targeting is imprecise; show hover highlight when eyes rest on an element — [visionOS design guidelines summary](https://smithery.ai/skills/ehmo/visionos-design-guidelines); primary (unfetched): [Apple HIG, Eyes](https://developer.apple.com/design/human-interface-guidelines/eyes)
- Meta, adapting from controllers: "Extend object colliders beyond the visible control and increase UI button sizes so users can reliably target with hands"; "hit targets tuned for controller-driven rays are usually too tight"; prefer "placement that confirms itself through snapping and alignment feedback instead of a separate confirm gesture" — [Meta, Hands: adapting from controllers](https://developers.meta.com/horizon/design/hands-adapting-from-controllers/)

Empirical button-size/spacing studies with virtual hands
- Park, Kim & Han (2018; Oculus Rift + Leap Motion, 18 participants, buttons at 50 cm): button widths 15/20/25 mm and spacing 1/5/9 mm tested; "the optimal levels of button size and spacing … are 25 mm and between 5 mm and 9 mm"; "button sizes of 15 mm with 1-mm spacing were too small to be used in VR"; errors and time fell as size/spacing grew; push (with visual push feedback) had fewer errors than touch; "Large size and spacing may cause fatigue, due to continuous extension of the arms" — [arXiv 1809.05833](https://arxiv.org/abs/1809.05833); journal version [Int. J. Industrial Ergonomics 2020](https://www.sciencedirect.com/science/article/abs/pii/S0169814119301052)
- Shi et al. (CHI EA 2023; bare-hand pointing with pinch confirmation, 18 participants, standing): targets were spheres of radius 10 cm in a 1 m³ volume 0.8 m in front of the user, with minimum inter-target distances of 20 cm (high density) and 30 cm (low density); mean selection times 3.0–4.2 s; several participants reported unintended activations from unintentional pinches; the authors recommend a pinch gesture for all confirmations — [ACM DL](https://dl.acm.org/doi/10.1145/3544549.3585615); [author PDF](https://yulingyun.com/wp-content/uploads/2023/08/Shi_2023_EBH.pdf)
- A ray-pointing study used target sizes of 7.5°, 4.5° and 1.5° of visual angle (0.66/0.39/0.13 m at 5 m) — [TouchView, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11598294/) (from search snippet)

Tracking error that the target must absorb (see KQ2 for full figures)
- Quest 2 fingertip error 1.1 cm mean (0.79 cm central, 1.3 cm peripheral) — [Abdlkarim et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10830632/)
- Quest 3 mean positional error 1.73 cm, jitter 1.11 cm (robot study) — [Godden, Steedman & Pan 2025, IEEE TVCG](https://pubmed.ncbi.nlm.nih.gov/40053653/)
- Oculus Quest (gen 1) touch-task absolute offset between target and sensed fingertip: mean 16 mm, SD 9 mm (n = 20; 18 mm targets on a physical touchscreen) — [Schneider et al. SUI 2021](https://arxiv.org/pdf/2109.10607)

### Inferences
- Converting vendor minima to 0.40 m: MRTK 2° → 1.4 cm; Meta/Apple-style 3° → 2.1 cm; Meta 60 dp primary-control rule and Park et al.'s 25 mm optimum both point to ≈2.5 cm as the visible target floor for hands. Provisional visible seed target: 2.5 cm diameter (≈3.6° at 0.40 m), never below 2.0 cm.
- The ring geometry is generous: inner-ring cell ≈ 4.7 cm (tangential) × 4.5 cm (radial). That allows a hit region of 3.5–4.0 cm (Meta "hit slop") while keeping a ≥0.5 cm dead band so neighbouring cells do not overlap (Meta/Ultraleap spacing rule; Park et al. 5–9 mm optimum).
- If raw Quest fingertip offsets (mean 16 mm, SD 9 mm in Schneider et al.) were applied open-loop, nearest-cell snapping with 4.5 cm pitch would land in the correct cell only when error < 2.25 cm ≈ 76% of the time; with closed-loop visual feedback (user sees the hand/cursor and corrects before pinching) real-world success is far higher, which is why Park et al. obtained usable 25 mm buttons with a ~13 mm-error tracker. The ≥90% first-try criterion therefore depends on feedback (hover highlight, cursor) as much as on size — see KQ2/KQ3 findings on feedback.
- Because Quest 3 error grows toward the periphery (Abdlkarim: 1.3 vs 0.79 cm) and the outer ring edge sits ≈37° off-axis at 0.40 m, the outer ring will suffer the worst tracking and the worst visibility; consider capping the outer radius at ≈0.25 m (≈32° off-axis) or expecting head turns.
- Head distance of ~0.4 m is below Meta's "render fixation objects at least 0.5 m away" comfort guidance (see KQ3 findings); 0.45–0.55 m from the eyes to the ring centre is a safer provisional layout.

### Gaps
- No study measured first-try pinch success vs target size on Quest 3 specifically at table scale; the ≥90% number must come from the project's own pinch test.
- Apple's primary HIG text (60 pt rule, point-to-degree conversion) could not be fetched; only secondary summaries were available.
- The Springer 2022 "button size for virtual hand interaction" study was behind a login redirect; its recommended sizes are unknown.
- Shi et al.'s success-rate percentages are only in a figure (image), not in the extracted text.

---

## KQ2. What pinch threshold/hysteresis and smoothing (e.g., 1€ filter parameters) do practitioners use for Quest hand tracking, and what are the measured accuracy/latency figures?

### Takeaway
Practitioner code uses a thumb-tip-to-index-tip distance of about 2 cm to enter pinch with a wider release distance (hysteresis), and the 1€ filter (start β = 0, min-cutoff 1 Hz, then tune) for jitter; measured Quest tracking error is ≈1–1.7 cm with ≈45–70 ms latency (Quest 2/3), so a pinch confirmation plus visual feedback is required.

### Cited Findings
Measured accuracy and latency
- Quest 2 (Abdlkarim et al., Behavior Research Methods 2023; 8 participants; 12-camera Qualisys ground truth at 240 Hz): fingertip positional error 1.1 cm mean (0.79 cm central vs 1.3 cm peripheral targets); joint-angle error 9.6° mean; absolute latency 45.0 ms (38 ms measured + 7 ms ground-truth system delay); errors increase with speed (MCP angle error 11.5° at 80 bpm vs 16.7° at 160 bpm) attributed to self-occlusion — [PMC10830632](https://pmc.ncbi.nlm.nih.gov/articles/PMC10830632/)
- Quest Pro vs Quest 3 (Godden, Steedman & Pan, IEEE TVCG 31(5), 2025; robot-driven): best-condition positional error 1.22 cm (Quest Pro) vs 1.73 cm (Quest 3); jitter 1.77 cm (Pro) vs 1.11 cm (Quest 3); latency highly variable, 15.8–229.2 ms (Pro) and 14.4–220.5 ms (Quest 3) — [PubMed 40053653](https://pubmed.ncbi.nlm.nih.gov/40053653/) (abstract via search snippet; full text not accessible)
- Quest 3 photon-to-hand-tracking latency ≈70.3 ms (31.3 ms hand-to-passthrough gap measured with 240 Hz through-the-lens capture + 39 ms passthrough latency); Vision Pro ≈127.7 ms — [Road to VR](https://roadtovr.com/apple-vision-pro-meta-quest-3-hand-tracking-latency-comparison/)
- Oculus Quest (gen 1) touch offset 16 mm ± 9 mm; Leap Motion 13 ± 6 mm; HTC Vive 37 ± 20 mm; HoloLens 2 15 ± 9 mm — [Schneider et al. SUI 2021](https://arxiv.org/pdf/2109.10607)
- Meta: hand tracking is unreliable for gestures "too close (< 10cm) to the HMD"; the tracking volume "exceeds the display field of view"; hands are hidden when pose confidence falls below a threshold (value unstated); long sleeves, rings, low light and direct sunlight degrade tracking; "movements away from player (punches) track better than parallel movements (chops)"; favour single-hand designs to limit hand-over-hand occlusion — [Meta, Hands best practices](https://developers.meta.com/horizon/design/hands-best-practices/); [Meta, Hands limitations & mitigations](https://developers.meta.com/horizon/design/hands-limitations-mitigations/)

Pinch thresholds and hysteresis in practice
- three.js `OculusHandPointerModel` (WebXR): pinch measured as distance between `index-finger-tip` and `thumb-tip`; `PINCH_THRESHOLD = 0.02` m to enter pinch, `PINCH_MAX = 0.05` m, `PINCH_MIN = 0.01` m used to scale the pointer/cursor as fingers approach — [three.js source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/webxr/OculusHandPointerModel.js)
- Ultraleap pinch/grab detection docs recommend a hysteresis value for un-pinching that is lower than the activation value "so you do not get jitter if the user's grab is on the threshold" — [Ultraleap, Pinch and grab detection](https://docs.ultraleap.com/xr-and-tabletop/xr/unity/plugin/features/pinch-and-grab-detection.html)
- Browser/MediaPipe practitioner example (not Quest): scale-invariant pinch ratio = thumb–index distance / wrist–middle-MCP distance; PINCHED when ratio < 0.42, RELEASED when ratio > 0.62; ≥140 ms between triggers; landmarks smoothed with a 1€ filter — [fingertune, GitHub](https://github.com/qthullie/fingertune)
- Community report (unverified): a 2026 Meta firmware update changed pinch hysteresis so that the release threshold is raised relative to the begin threshold — [WiVRn issue #898](https://github.com/WiVRn/WiVRn/issues/898)
- Meta's Interaction SDK exposes a `OneEuroFilterPropertyBlock`, i.e. Meta itself uses 1€ filtering on hand input — [Meta ISDK API reference](https://developers.meta.com/horizon/reference/interaction/v72/struct_oculus_interaction_input_one_euro_filter_property_block/)
- 1€ filter (Casiez, Roussel & Vogel, CHI 2012): parameters `mincutoff` (Hz; lower removes more jitter), `beta` (higher reacts faster, less lag), `dcutoff` (1 Hz default). Tuning: "set beta to 0 and mincutoff to a reasonable middle-ground value such as 1 Hz", then lower mincutoff until jitter at rest is acceptable, then raise beta until fast-motion lag is acceptable — [1€ filter homepage](https://cristal.univ-lille.fr/~casiez/1euro/)

Feedback that practitioners pair with pinch
- Microsoft: provide distinct visuals for default / hover / pressed; for near interaction show a fingertip proximity ring that shrinks to a dot at contact; play sounds on contact begin/end and grab begin/end — [Microsoft Learn, Interactable object](https://learn.microsoft.com/en-us/windows/mixed-reality/design/interactable-object)
- Meta: "Because hands provide no haptic feedback the way a controller does, visual feedback matters even more"; highlight active fingers; add success effects when gestures complete — [Meta, Hands onboarding best practices](https://developers.meta.com/horizon/design/hands-onboarding-best-practices/)
- Meta eyes/hands hover timing table: colour hover-on 300 ms, hover-off 400 ms; motion hover-on 150 ms delay + 475 ms; press 80 ms, release 100 ms, deselect 300 ms — [Meta, Eyes best practices](https://developers.meta.com/horizon/design/eyes-best-practices/)

### Inferences
- Provisional pinch detector for Roomsong (WebXR hand joints): enter pinch when tip-to-tip distance < 2.0 cm, release when > 3.0–3.5 cm (hysteresis ≥1 cm, consistent with three.js 0.02 m enter and Ultraleap's lower-release rule), require the pinch state to persist ≥ 2 frames (~28 ms at 72 Hz) before committing, and ignore re-triggers within ~120–150 ms (fingertune uses 140 ms). Validate against Quest 3's ≈1.1 cm jitter.
- Smoothing: 1€ filter on the pinch point (midpoint of thumb and index tips) with mincutoff ≈ 1 Hz and beta ≈ 0 as the starting point per Casiez; tune beta upward only if drag-to-move feels laggy. Do not filter the pinch distance itself heavily or the enter latency will add to the 45–70 ms platform latency.
- Because latency is 45–70 ms and jitter ≈1 cm, commit "plant" on pinch release (or on a short hold) rather than on pinch start, and show a hover highlight on the target cell before the pinch (closed-loop correction).
- Keep the planting hand below the heart and the ring ≥10 cm from the headset (Meta rules) — trivially true at 0.4 m.

### Gaps
- Meta does not publish the pinch-strength threshold or hysteresis used by Horizon OS/Interaction SDK; the WebXR Hand Input API exposes joints only, so the app must implement pinch itself.
- No published 1€ parameters tuned specifically for Quest 3 WebXR hand joints were found; the values above are starting points.
- Full text of the Quest 3 robot study (per-condition error vs distance/speed) was not accessible.

---

## KQ3. What dwell time and reticle size for head-gaze selection minimise false activations (and is eye tracking available on Quest 3)?

### Takeaway
Quest 3 has no eye tracking, so gaze fallback means head gaze. The literature's typical dwell band is 600–1200 ms, with 300 ms workable only for trained users and simple tasks; targets for gaze/head pointing should be ≥2.5–3° with "spatial hysteresis" (target grows once entered). Provisional: 900 ms dwell, 3° reticle target, cancel on exit, visible progress ring.

### Cited Findings
- Quest 3 has no eye tracking; Meta CTO Bosworth cited cost, weight, compute and pancake-lens challenges; no sensor exists for an add-on — [MIXED](https://mixed-news.com/en/quest-3-eye-tracking-hurdles/)
- Meta: eye tracking availability "varies by device and can drop out during use"; when unavailable "targeting falls back to hand/controller ray, then head gaze"; the 3° minimum assumes eye-tracking precision and "fallback modalities lack this precision" — [Meta, Eyes best practices](https://developers.meta.com/horizon/design/eyes-best-practices/)
- Hansen, Rajanna, MacKenzie & Bækgaard (COGAIN 2018; FOVE HMD; 41 participants): 300 ms dwell vs click; throughput mouse 3.24 bit/s, head 2.47, gaze 2.13; dwell activation was faster than click; effective target width ≈3° for gaze and ≈2.5° for head; click error rates gaze 1.53%, head 0.26%, mouse 0.06%; targets tested were ≈2° and ≈4°; "Spatial hysteresis was set to 2.0 for all dwell conditions, meaning that when targets were first entered, they doubled in size, while visually remaining constant"; cites Majaranta et al. — expert users handle dwell "as low as 282 ms with errors being just 0.36%"; cites head-pointing typing with 400 ms dwell — [Hansen et al. 2018 PDF](https://www.yorku.ca/mack/etra2018.pdf)
- Survey of eye-tracked VR: dwell thresholds are typically "about 600–1200 ms", long dwell reduces false activations but adds delay; >1 s is considered long, short can be ≈280 ms; cites GazeDock (471 ms mean selection, 3.6% false-trigger rate with personalisation) — [arXiv 2305.14080](https://arxiv.org/html/2305.14080v2) (from search snippet)
- GazeIntent (Quest Pro eye tracking, ~66 Hz; 18 + 16 participants): task-specific dwell thresholds from a pilot were 0.3 s (simple circle selection), 1.2 s (sliding puzzle) and 1.5 s (arithmetic); the "Midas touch" problem is unintentional selection of objects the user only glanced at — [arXiv 2404.13829](https://arxiv.org/html/2404.13829)
- Meta accessibility best practice: do not require precise timing without alternatives or extensions; provide gesture alternatives for users who cannot perform required gestures — [Meta, Accessibility checklist](https://developers.meta.com/horizon/design/accessibility-checklist/)
- W3C XAUR: REQ 15b "Allow timings for interactions or critical inputs to be modified or extended" — [W3C XAUR](https://www.w3.org/TR/xaur/)

### Inferences
- For Roomsong's head-gaze accessibility mode (used by people who cannot pinch, i.e. untrained in the gaze sense), 900 ms is a defensible midpoint of the 600–1200 ms band, with a user setting of 600 / 900 / 1200 ms (XAUR 15b). 300 ms (Hansen) is for trained users and would raise Midas-touch errors in a garden where the user looks around.
- Reticle/target: head pointing's effective width is ≈2.5°, so the gaze target should be ≥3° (≈2.1 cm at 0.40 m, 2.6 cm at 0.50 m); the 2.5 cm seed target already meets this at 0.40 m. Add Hansen-style spatial hysteresis (hit region ×2 after entry) so small head tremor does not cancel the dwell.
- Dwell should only arm on cells (not on the whole table), should reset on exit, and should show a filling ring so the user can abort by looking away — standard Midas-touch mitigations (Hansen; GazeIntent).

### Gaps
- No study was found of head-gaze dwell on Quest 3 specifically; the search budget ran out before a head-only dwell query could be run. Values above are transferred from HMD gaze/head studies.
- Meta's own hover timing table is for eye-tracked devices, not head gaze.

---

## KQ4. Which scale/mode/tempo/voice-count rules make a 16-step, 5-pitch garden sound musical rather than random?

### Takeaway
Successful products converge on the same recipe: a pentatonic (or modal subset) pitch set so any combination is consonant, a step-grid with a sweeping playhead (Tenori-on/Song Maker), slow tempi (≈60–80 bpm is the relaxation band), delayed/echoed repeats that are deliberately imperfect (Bloom), and effects that deepen with each repeat; small timing randomisation should be subtle, not exaggerated.

### Cited Findings
Pitch set
- Endel's sound designer: "we first used the pentatonic scale … because of its popularity across modern music" and preferred simple ratios "like octaves, 2:1, or a perfect fifth, 3:2, because those are pleasing to the brain"; to avoid listener fatigue, "Using less complex tones, melodies, and movement helps ease the burden on our minds"; slow tempos and low frequencies are calming — [Amazon Science on Endel](https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes)
- Endel's core algorithm is described as based on circadian rhythms, pentatonic scales and sound masking, with inputs time, weather, heart rate and location; it also uses ~110-minute ultradian cycles — [Amazon developer blog](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2020/06/the-sounds-of-science-how-endels-audio-environments-are-helping-shape-the-future-of-ambient-computing)
- Chrome Music Lab Song Maker: scale options C Major, Pentatonic, Chromatic; defaults 4 bars, 4 beats per bar, split 2, starting on middle C, range 2 octaves (3 available); tempo 40–240 bpm — [Gigazine report](https://wbgsv0a.gigazine.net/gsc_news/en/20180302-chrome-music-lab-song-maker); [LMEA lesson PDF](https://lmeamusic.org/wp-content/uploads/2020/12/Benoit-Chrome-Music-Lab-Song-Maker-Project.pdf)
- Bloom (Eno & Chilvers 2008): tapping creates tones over a low drone; sounds loop and are taken over by the app when idle; 12 "mood" settings that change the way tones sound; delay is user-adjustable; shaking clears — [Wikipedia, Bloom](https://en.wikipedia.org/wiki/Bloom_(software)); scales carry names such as "ambrette", "benzoin", "bergamot", "neroli", "vetiver" (search snippet, derived from the app)
- Chilvers on Bloom's delay: "anything you play is repeated back at you after a delay, but the length of that delay varies in subtle, but complex ways"; the drift is "deliberately 'wrong' — you can't play exactly in time with something you've already played … Brian liked the effect, and we ended up emphasising it" — [USO interview with Peter Chilvers, 2009](https://usoproject.blogspot.com/2009/09/generative-music-interview-with-peter_19.html)
- Chilvers (Tape Op): Bloom rewards restraint — "if you leave a pause it responds and rewards you for pausing by giving you a bit more variety"; users who "tap away frantically" learn to slow down; Bloom: 10 Worlds routes each successive echo through more treatment ("First time something echoes, the signal is mostly untreated with a bit of reverb. Second time through, there's a little bit of low pass and chorusing … Every sound gets put through more and more effects the more times it's repeated"); Reflection repeats phrases "slightly differently … shift up and down a few semitones, at random"; Eno spent about a week refining Bloom's basic ping sound — [Tape Op #137, Peter Chilvers](https://tapeop.com/interviews/137/peter-chilvers)
- Eno's 1996 generative-music talk: generative music is "a system or a set of rules which once set in motion will create music for you"; Koan allocated ~150 conditions "each operating within its own probability range" to each voice — [In Motion Magazine, Eno 1996](https://inmotionmagazine.com/eno1.html); [Wikipedia, Koan](https://en.wikipedia.org/wiki/Koan_(program))
Grid conventions
- Yamaha Tenori-on (Toshio Iwai, 2007): 16 × 16 grid of LED switches; notes triggered by a line of light sweeping left to right; marketed as intuitive enough that "even non-musicians can enjoy improvising and even composing immediately" — [Wikipedia, Tenori-on](https://en.wikipedia.org/wiki/Yamaha_Tenori-on); [Sound On Sound review](https://www.soundonsound.com/reviews/yamaha-tenori)
- Electroplankton (Iwai, 2005): designed so players "enjoy the game both viscerally and without preparation"; deliberately no save function so it is not treated as a tool with menus — [Wikipedia, Electroplankton](https://en.wikipedia.org/wiki/Electroplankton)
Tempo
- Clinical/relaxation music studies tend to use ≈60–80 bpm; "Weightless" starts at 60 bpm and slows to 50 bpm; music above ~80 bpm sustains or increases arousal — [Psychiatrist.com](https://www.psychiatrist.com/news/worlds-most-relaxing-song-may-reduce-anxiety-by-65); [JYU thesis on anxiety reduction](https://jyx.jyu.fi/bitstream/handle/123456789/60533/1/anxietyreduction.pdf) (moderate-reliability secondary sources)
- Endel cites research that "infants exposed to a heart rate of 72 bpm at 85db overwhelmingly appeared happier" as rationale for heart-rate-like tempos — [Amazon Science](https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes)
Humanisation / swing
- Groove ratings were high for microtiming magnitudes equal to or smaller than originally performed and decreased for exaggerated magnitudes; fully quantised music and originally-performed microtiming were rated equally high — [Frontiers in Psychology 2016 (PMC5050221)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5050221)
- In jazz, quantised versions were rated slightly higher for swing than originals; rock listeners prefer a perfectly quantised drum performance; experts are more sensitive to manipulation — [Datseris et al., arXiv 1904.03442](https://arxiv.org/pdf/1904.03442); [Frontiers 2015](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01232/full)

### Inferences
- Five rings = five pitch classes maps naturally to a pentatonic scale (major or minor), giving the Song Maker/Endel "no wrong notes" property by construction; the room signature can pick the mode (major/minor pentatonic, or a modal subset such as Dorian minus two tones) and root without ever leaving a consonant set.
- Register separation: assign each ring an octave/instrument band so simultaneous steps do not pile up in one register; Endel's "simple ratios" principle supports keeping the drone on root/fifth below the garden.
- Tempo: 60–80 bpm quarter notes with 16 steps = one 4-bar phrase of ~12–16 s; this matches Song Maker's default 16 cells and the relaxation band.
- Repeats/echoes: emulate Bloom — echo each planted note 1–3 times with a slightly drifting delay and progressively more low-pass/reverb per repeat; reward pauses with variation rather than density.
- Humanisation: apply only small, non-exaggerated timing/velocity jitter (the groove literature finds quantised and natural-magnitude microtiming equally pleasant; exaggeration hurts); do not add a hard swing to ambient material.
- Probability: Koan-style per-voice probability (e.g., a step plays 85–95% of the time, a 5–15% chance of an octave/neighbour-tone variation) gives Eno's "ever-different" quality without leaving the scale.

### Gaps
- No primary source gives Bloom's exact scale definitions, delay times, or voice limits; the schollz/bloom norns reimplementation ([GitHub](https://github.com/schollz/bloom)) may encode them but was not inspected.
- Numeric humanisation magnitudes (ms) appropriate for ambient tempi were not found; the cited studies report relative magnitudes only.
- Voice-count rules: Huron's "Tone and Voice" perceptual voice-leading principles (Music Perception 2001) could not be fetched (host unreachable) and the search budget was exhausted; no citable concurrent-voice limit is given here.
- Tempo evidence is from relaxation/anxiety literature (secondary summaries), not from generative-music product documentation.

---

## KQ5. How expensive are 24 HRTF panners + 3 convolution reverbs on a mobile CPU, and what is a safe Web Audio budget?

### Takeaway
No published benchmark for that exact graph on Quest exists; but the Web Audio performance literature is unambiguous that HRTF PannerNodes (four convolvers each) and ConvolverNodes are the two most expensive node types and should be replaced on mobile by equal-power panning plus a shared short reverb. Provisional budget: 24 equal-power panners, one shared convolver with a ≤1.5–2 s procedural IR (plus optionally one short "early" convolver), a 100 ms look-ahead scheduler, and `latencyHint` raised if glitches appear — all to be measured in a soak test on a real Quest.

### Cited Findings
Scheduling
- Chris Wilson, "A Tale of Two Clocks": schedule audio from a JS timer that looks ahead; "A good place to start is probably 100ms of 'lookahead' time, with intervals set to 25ms"; setTimeout can be delayed by layout, rendering, GC; larger lookahead = more resilience, slower tempo-change response — [web.dev](https://web.dev/articles/audio-scheduling)
- Tone.js: default `lookAhead` 0.1 s; `latencyHint` "interactive" (default), "playback" or "balanced"; start Transport slightly in the future; use Tone.Draw for visuals rather than DOM work in audio callbacks; "The most processor intensive nodes are the ConvolverNode (Tone.Convolver) and PannerNode using HRTF (Tone.Panner3D)" — [Tone.js wiki, Performance](https://github.com/Tonejs/Tone.js/wiki/Performance)
Node costs
- PannerNode HRTF: "Very expensive. This node is constantly doing convolutions between the input data and a set of HRTF impulse", requiring four simultaneous convolvers during stereo playback with movement, adds latency and loads an impulse database into memory; equal-power is "rather cheap" (vector maths, no memory); ConvolverNode performs multiple FFTs per block and cost scales with impulse length, with bursts possible in some browsers; on mobile, replace HRTF with "a very short reverb and an equal-power panner" and cheaper convolution via "delay lines, all-pass and low-pass filters"; Android output latency ranges 12.5–150 ms by device; bigger buffers improve stability; avoid AudioParam automation-event bloat by swapping nodes — [Paul Adenot, Web Audio performance notes](https://padenot.github.io/web-audio-perf/)
- The Web Audio spec changed the default panningModel from HRTF to equalpower because HRTF is expensive — [WebAudio/web-audio-api issue #368](https://github.com/WebAudio/web-audio-api/issues/368)
- Resonance Audio (Google) splits early reflections (spatialised per reflection) from late reverb and states its reverb "reacts in real time" to room size and wall materials, with "cost efficiency … of particular benefit to mobile platforms" (no numbers) — [Resonance Audio concepts](https://resonance-audio.github.io/resonance-audio/discover/concepts.html)
AudioWorklet
- AudioWorkletProcessor runs on fixed 128-frame blocks (~3 ms at 44.1 kHz); exceeding the budget glitches; WASM avoids JIT and GC overhead; MessagePort messaging is "suboptimal for real-time audio" (allocation + latency), hence SharedArrayBuffer/ring-buffer patterns — [Chrome Developers, AudioWorklet design patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern)
- The Web Audio graph renderer runs on a dedicated high-priority (usually real-time) thread — [Hongchan Choi, W3C workshop 2021](https://w3.org/2021/03/media-production-workshop/talks/hongchan-choi-building-audio-apps.html)
Android/Quest-class behaviour
- Chrome for Android: AudioWorklet skips/glitches under the "playback" latency category because the device callback arrives every 250–500 µs with 32–96 frames, mismatching the 128-frame render quantum — [Chromium issue 40133762](https://issues.chromium.org/issues/40133762) (from search snippet; tracker requires sign-in); a Pixel-specific fix addressed 96-frame hardware bursts vs 128-frame quanta — [Chromium media review](https://groups.google.com/a/chromium.org/g/feature-media-reviews/c/_a4oNpDGEYE)
- A practitioner eliminated Chrome-for-Android glitches (not CPU-bound, <1 ms per process call) by "Setting a large latencyHint like 0.05" seconds — [kanejaku.org](https://kanejaku.org/posts/2021/02/reducing-audio-glitches-on-chrome-for-android/)
- Chromium "Intent to ship": a buffering/latency hint via `playbackCategory`; "balanced" lets Web Audio co-exist with WebRTC without glitches — [blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/FyxYC3TE8ck)
- Meta's WebXR performance pages cover rendering only; no Web Audio guidance was found there — [Meta, WebXR perf best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/)
Synthesis recipes and reverb
- Karplus & Strong 1983, "Digital Synthesis of Plucked-String and Drum Timbres", Computer Music Journal 7(2): a short noise burst looped through a filtered delay line — [Wikipedia](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis); [Karplus, digitar page](https://users.soe.ucsc.edu/~karplus/digitar.html)
- Chowning's FM synthesis (1967–73) yields "metal striking" or "bell like" sounds with a simple, cheap operator pair — [CCRMA, John Chowning](https://ccrma.stanford.edu/people/john-chowning)
- Procedural reverb: Tone.js `Reverb` builds its impulse response from decaying noise rendered offline and feeds a ConvolverNode — [Tone.js Reverb typings](https://unpkg.com/browse/tone@15.1.22/build/esm/effect/Reverb.d.ts); ConvolverNode accepts mono/stereo/4-channel IRs with optional equal-power normalisation — [MDN ConvolverNode](https://developer.mozilla.org/docs/Web/API/ConvolverNode)

### Inferences
- 24 HRTF panners is roughly 96 continuous convolutions plus per-move interpolation — orders of magnitude more than 24 equal-power panners; the literature's mobile advice applies directly. Provisional rule: equal-power for all seeds, distance gain by a custom curve; if a demo "hero" source needs HRTF, cap it at 1–2 sources and A/B on device.
- Three convolution reverbs multiply the most expensive node; use a send-bus architecture (all voices → one shared convolver) and derive "three rooms" by changing one IR, not by running three convolvers. A 48 kHz, 1.5–2 s stereo procedural IR is the provisional ceiling; Sabine-based RT60 (KQ6) decides its decay.
- Keep the main-thread scheduler at 100 ms look-ahead / 25 ms tick (Wilson) and keep synthesis in native nodes (OscillatorNode/BiquadFilter/Gain/Delay) which run on the real-time thread; use AudioWorklet only if a custom DSP (e.g., Karplus-Strong) proves necessary, and then avoid allocations in `process()`.
- Start the AudioContext with `latencyHint: 'playback'` or a numeric hint (~0.05 s) if the Quest browser exhibits the Android burst-size glitch; note the trade-off of ≈50–100 ms added output latency, which the look-ahead scheduler tolerates.
- Voice stealing: cap polyphony (e.g., 16–24 simultaneous envelopes) and steal the oldest/quietest; no source gives a Quest-specific number — measure.

### Gaps
- No measured CPU percentages for PannerNode HRTF or ConvolverNode on Quest 2/3 (or any Snapdragon XR2) were found; the budget must come from the project's own soak test.
- No source documents Meta Quest Browser's Web Audio output latency or whether it shows the Android 96-frame burst issue.
- Chromium issue details were only available via search snippet.

---

## KQ6. Is there a published "room → music" mapping with user-perceived meaning, and what simple, defensible rules follow (e.g., room volume → reverb time via Sabine; table height → register)?

### Takeaway
No prior product maps room geometry to key/mode/tempo, but two strands make a defensible mapping: (1) psychoacoustics — reverberation time is the dominant cue listeners use to judge room size, and Sabine's formula ties RT60 to volume/absorption; (2) sonification science — listeners' preferred polarity is "bigger → lower pitch". Together they justify: room volume → reverb decay (RT60 = 0.161·V/A), room size → lower base register / slower tempo, and surface-specific "tuning ripples" as early-reflection analogues.

### Cited Findings
- Sabine's equation: RT60 = 0.161·V/A in metric units (V = volume m³, A = total absorption in metric sabins = Σ surface area × α); published by W. C. Sabine in 1900 after Fogg Lecture Hall experiments; assumes a diffuse field and uniform absorption, Eyring is better for very dead rooms — [MathWorks rt60](https://kr.mathworks.com/help/audio/ref/rt60.html); [Britannica, Reverberation time](https://www.britannica.com/science/acoustics/Reverberation-time)
- Reverberation drives perceived room size: "The reverberant room was judged to be significantly larger than the anechoic room for all stimuli"; "Reverberation time strongly affects room size perception (much more so than the physical room volume)", with judgments following a power function; estimates were larger for speech than clicks/noise; even weak reverberation cues convey room size — [Cambridge repository (factors affecting auditory estimates of room size)](https://www.repository.cam.ac.uk/handle/1810/323538); [ARU figshare version](https://aru.figshare.com/articles/journal_contribution/Factors_affecting_auditory_estimates_of_virtual_room_size_Effects_of_stimulus_level_and_reverberation/23766504); [Forum Acusticum 2023 paper](https://dael.euracoustics.org/confs/fa2023/data/articles/001045.pdf) (from search snippets)
- Resonance Audio: early reflections "give us an impression of the size and shape of the room"; late reverb builds as reflections densify; the engine re-computes reverb when room dimensions or wall materials change — [Resonance Audio concepts](https://resonance-audio.github.io/resonance-audio/discover/concepts.html)
- Walker's magnitude-estimation sonification studies: listeners produce power-function mappings; for frequency→size the polarity is negative — "increasing frequency … maps onto DECREASING size. Ecologically speaking … small bells ring with high frequencies, large bells ring with low frequencies" — [Bruce Walker, auditory.org posting](https://auditory.org/postings/2000/327.html); [Walker PhD research page](https://sonify.psych.gatech.edu/walkerb/research/phd/index.html)
- Architecture-to-music sonification exists as art/research: the Philips Pavilion was reconstructed as nine ruled surfaces and its ruling lines sonified as string glissandi, with sampled points generating density-based blocks — [arXiv 2607.06589](https://arxiv.org/pdf/2607.06589)
- Spatial sonification of mapped environments renders obstacles through binaural room impulse responses — [arXiv 2412.05486](https://arxiv.org/html/2412.05486)

### Inferences
- Rule 1 (reverb): RT60 = 0.161·V/A with V from the WebXR room mesh/planes bounding box and A from an assumed furnished-room absorption (α ≈ 0.2–0.3 is a common design assumption, but no source for that value was captured here — validate or expose as a setting); clamp RT60 to 0.3–2.0 s for mixing sanity. Users will perceive "bigger room → longer tail" because reverberation is their primary room-size cue.
- Rule 2 (register): larger room volume → lower root/base octave (Walker's negative frequency–size polarity); small desks/rooms → brighter, higher register.
- Rule 3 (tempo): room volume → slower tempo for larger rooms is plausible but not evidenced; keep within 60–80 bpm regardless (KQ4).
- Rule 4 (surface ripple): treat each detected wall/ceiling as an early-reflection source; the "tuning ripple" that shows which surface made which note is an honest visualisation of early reflections (Resonance Audio's model), which is why it should feel meaningful rather than arbitrary.
- Table height → register has no direct evidence; frame it as a hypothesis in the validation plan rather than a design rule.

### Gaps
- No published product or study maps room geometry to key/mode; "room signature" is novel and its perceived meaningfulness must be tested with users.
- Typical absorption coefficients for furnished domestic rooms were not captured with a source.
- The exact power-function exponents in the room-size perception papers were not extracted (snippets only).

---

## KQ7 (objective A detail). Seated reach, fatigue and FoV: where should the ring sit relative to the seated user?

### Takeaway
Keep all interaction below shoulder height and close to the body (fatigue rises sharply as the arm approaches horizontal), size the layout for the 5th-percentile female reach, put essential UI near the centre of a 70° × 66° nominal field of view, and render fixation targets at ≥0.5 m.

### Cited Findings
- Consumed Endurance (Hincapié-Ramos et al., CHI 2014): a metric for the "gorilla-arm effect" derived from upper-arm biomechanics, correlating strongly with Borg CR10 perceived exertion; applicable to repetitive mid-air input — [U. Manitoba HCI lab](https://hci.cs.umanitoba.ca/publications/details/consumed-endurance-a-metric-to-quantify-arm-fatigue-of-mid-air-interactions)
- NICER (Li et al., ACM TOG 2024): fatigue development "increases sharply below 90° shoulder abduction but then plateaus above 90°"; Borg slope and duration are roughly constant between 90° and 135°; recovery factor R = 0.04 s⁻¹; brief 15-second breaks produced noticeable subjective recovery; design recommendation: keep interactions below shoulder level — [arXiv 2406.08875](https://arxiv.org/html/2406.08875v1)
- Meta: avoid "hands to be held above heart level or excessive reaching"; place most-used features closer to the body and less important ones farther — [Meta, Hands best practices](https://developers.meta.com/horizon/design/hands-best-practices/); [Meta, Hands design overview](https://developers.meta.com/horizon/design/hands/)
- Shi et al. 2023: the technique requiring the most reaching (MultiFingerBubble) produced significantly higher Borg CR10 arm fatigue (median 2.5 vs 1.0) — [Shi et al. PDF](https://yulingyun.com/wp-content/uploads/2023/08/Shi_2023_EBH.pdf)
- Ergonomics: Squires' normal working area models the elbow describing an arc of radius 17.78 cm with external arm rotation limited to 65°, the forearm sweeping a comfortable area in front of the seated worker — [NJIT, Normal horizontal working area](https://digitalcommons.njit.edu/fac_pubs/15975); [INSST NTP 1088](https://www.insst.es/documentacion/colecciones-tecnicas/ntp-notas-tecnicas-de-prevencion/31-serie-ntp-numeros-1066-a-1101-ano-2016/ntp-1088-alcance-maximo-y-normal-en-el-plano-horizontal-2017); maximum reach envelopes should be designed for the 5th-percentile female, whose reach averages 13.5% less than the male's, and seated envelopes are significantly smaller than standing — [NJIT, Maximum reach envelope](https://digitalcommons.njit.edu/fac_pubs/15559)
- Ultraleap: "how far users can reach and what they find comfortable can vary enormously" — [Ultraleap design principles](https://docs.ultraleap.com/xr-guidelines/Getting%20started/design-principles.html)
- Meta FoV page (Meta VR Glasses; device-level simulation available on Quest 3S/3/Pro): nominal straight-ahead FoV 70° horizontal × 66° vertical (per-eye render extent 74° × 68°); "Keep primary actions and status information near the center"; avoid dense groups of small targets near the view boundary; "A target near the edge of the visible area appears smaller"; provide alternative access for edge-only actions; fit and gaze direction reduce the visible area — [Meta, Field of view](https://developers.meta.com/vr/essentials/field-of-view/)
- Meta display guidance: objects the user fixates on for extended periods "should be rendered at least 0.5 meters away"; 1 m is comfortable for menus; Quest LCDs cannot render very dark pixels (below 13/255) so author content in brighter ranges — [Meta, Display](https://developers.meta.com/horizon/design/display/)
- Meta VRC.Quest.Accessibility.9: all interactions accessible from a fixed seated or standing position — [Meta, Accessibility checklist](https://developers.meta.com/horizon/design/accessibility-checklist/)

### Inferences
- A table-top ring at 0.12–0.30 m radius centred ≈0.35–0.45 m in front of the seated user keeps the hand well below the shoulder and within a forearm sweep; the outer ring (r = 0.30 m) is near the limit of Squires' comfortable area for small users — expose a "ring size" setting and default to r_outer ≈ 0.25 m.
- With a 70° × 66° nominal FoV, a 0.30 m outer radius at 0.40 m sits ≈37° off-axis, i.e., outside the half-FoV (35°) when the head is centred; at 0.50 m it is 31°. Either place the ring centre ≥0.5 m away (also satisfying Meta's fixation-distance rule) or shrink the outer radius.
- Build in rest: Listen mode doubles as a recovery period (NICER's 15 s recovery evidence); a 10-minute session should not require continuous arm elevation.

### Gaps
- Centimetre values for the seated "normal working area" radius (commonly quoted ≈35–40 cm) were not captured from a primary source; only Squires' elbow-arc radius (17.78 cm) was.
- Whether the contest's "FoV-aware" rule refers to the Meta VR Glasses 70° × 66° figure or to Quest 3's wider FoV is not established by these sources; Quest 3's own FoV figure was not sourced in this pass.

---

## KQ8 (objective A detail). What accessibility rules apply (XAUR, Meta VRCs, WCAG flashing), and what onboarding research exists for hand-tracked apps?

### Takeaway
Meta's accessibility VRCs are recommended (not required) and map cleanly onto Roomsong's planned modes (one-handed, high contrast, captions for sound, multi-cue feedback, seated play); XAUR adds timing extension, gesture alternatives and motion-sickness avoidance; WCAG's three-flashes rule gives the flashing limit. Meta's onboarding page prescribes teach-by-doing with looping 3D hand demos, one or two gestures at a time, and mastery gates.

### Cited Findings
Accessibility
- Meta VRCs (all recommended): playable without audio or with subtitles for all dialogue and sound effects (A.1); legible text/controls with increased-contrast or larger-UI options (A.2); feedback through multiple cues — visual, audio, haptic (A.3); playable one-handed (A.4); adjustable brightness/contrast (A.5); colour-blind support via patterns/icons/text (A.6); view rotation without moving the head (A.7); multiple locomotion styles (A.8); all interactions accessible from a fixed seated or standing position (A.9). Best practices: 4.5:1 contrast for normal text, 3:1 for large text and UI; 48dp hit targets, ≥32dp visual targets; no precise-timing requirements without alternatives; gesture alternatives; sp units for text — [Meta, Accessibility checklist](https://developers.meta.com/horizon/design/accessibility-checklist/)
- W3C XAUR (Note, 2021): REQ 2a act "in a device independent way, without having to do so physically"; REQ 2c multiple input methods simultaneously; REQ 4a/4b targets not requiring fine motor control with adequate spacing; REQ 6a high-contrast skins; REQ 9c remap gestures to other inputs; REQ 15a/15b adjustable speed and extendable timings; REQ 16a avoid triggers of epilepsy/motion sickness with alternatives; REQ 18a mono audio option; REQ 19a/19b captions with customisable placement in the immersive environment — [W3C XAUR](https://www.w3.org/TR/xaur/)
- WCAG 2.1 SC 2.3.1: no more than three general flashes and/or three red flashes in any one-second period, or the flashing area is under 0.006 steradians within any 10° visual field (25% of that field) — [W3C, Understanding 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)
Onboarding
- Meta hands onboarding: "Text-heavy tutorials are harder to follow in VR … players want to play, not read"; "Show, don't tell hand gestures" with animated 3D hand outlines; "Keep the demonstration on screen and loop the animation"; "teach one or two gestures at a time" with practice and payoff; "Require players to successfully perform a critical gesture before they can advance"; give "a stress-free place to practice: somewhere they cannot fail"; "Resist the urge to teach everything at once"; tell players to put controllers away; visual feedback matters more because hands have no haptics — [Meta, Hands onboarding best practices](https://developers.meta.com/horizon/design/hands-onboarding-best-practices/)
- Ultraleap: physical interactions (object manipulation) are often picked up without explanation, but learned poses like pinch "are hard to describe with just words" — show the action so users copy it, with text/audio description; either a practice tutorial first or step-by-step introduction during the experience — [Ultraleap, Tutorials, hints and help](https://docs.ultraleap.com/xr-guidelines/Getting%20started/tutorials_hints_tip.html)
- Meta adapting-from-controllers: let placement confirm itself via snapping/alignment feedback rather than a separate confirm gesture — [Meta](https://developers.meta.com/horizon/design/hands-adapting-from-controllers/)

### Inferences
- Roomsong's "first 30 seconds": a looping ghost-hand pinch over one glowing cell, no text, gate the tide on the first successful pinch (Meta mastery gate), then introduce pull-to-grow and drag-to-move one at a time, each with immediate musical payoff.
- Captions for sound (A.1/XAUR 19) are satisfied by the planned caption/halo visuals; the "no flashing >3 Hz" rule should be implemented as a hard cap on tide/halo pulse rates and on any strobing seed feedback.
- Dwell-time extension (XAUR 15b) and one-handed mode (A.4) are explicit VRC/XAUR items and should be visible in the settings panel for the Accessibility Forward award.

### Gaps
- XR Access guidelines were not fetched in this pass (budget); XAUR and Meta's checklist cover the same requirements.
- No controlled study on "first-30-seconds" onboarding effectiveness for hand-tracked apps was found; Meta/Ultraleap guidance is practitioner guidance, not measured evidence.

---

## Provisional numbers to validate in the pinch test (consolidated)

| Parameter | Provisional value | Basis (see sections) | Conflict / note |
|---|---|---|---|
| Visible seed target diameter | 2.5 cm (≈3.6° at 0.40 m) | Meta 60 dp primary control; Park et al. 25 mm optimum; Meta eyes 3° floor | MRTK allows 1.6 cm (2°) at 45 cm — floor only, not for 1–2 cm tracking error |
| Hit region (hit slop) | 3.5–4.0 cm, nearest-cell snap within cell | Meta hit-slop rule; cell pitch ≥4.5 cm | Keep ≥0.5 cm dead band between cells (Park 5–9 mm) |
| Ring centre distance from eyes | 0.45–0.55 m (not 0.40 m) | Meta ≥0.5 m fixation rule; FoV 70°×66° geometry | Reach for 5th-percentile seated users — expose ring-size setting |
| Outer ring radius | ≤0.25 m default | FoV off-axis angle; Squires' working area | Brief says up to 0.30 m |
| Pinch enter / release | <2.0 cm / >3.0–3.5 cm tip-to-tip; ≥2-frame debounce; 120–150 ms re-trigger lockout | three.js 0.02 m; Ultraleap hysteresis; fingertune 140 ms | Quest 3 jitter ≈1.1 cm |
| Smoothing | 1€ filter, mincutoff 1 Hz, beta 0 → tune | Casiez tuning procedure; Meta ISDK uses 1€ | No Quest-3-specific values published |
| Commit moment | On pinch release (or short hold), after hover highlight | 45–70 ms latency; Midas-touch mitigation | — |
| Head-gaze dwell | 900 ms (user-adjustable 600/900/1200), 3° target, hit ×2 after entry, progress ring | Survey 600–1200 ms; Hansen 2.5–3° effective width, spatial hysteresis | 300 ms (Hansen) only for trained users |
| Scale | Pentatonic (major/minor) chosen by room signature; drone root/fifth | Endel; Song Maker; Eno/Koan | — |
| Tempo | 60–80 bpm; 16 steps per 4-bar phrase | Relaxation literature; Tenori-on/Song Maker grid | Evidence is secondary |
| Echo/variation | 1–3 drifting echoes, more treatment per repeat; pauses yield variation | Bloom (Chilvers) | — |
| Humanisation | Subtle only, ≤ natural magnitude, no exaggerated swing | Groove/microtiming studies | No ms value sourced |
| Spatialisation | 24 × equal-power panners; HRTF for ≤1–2 hero sources if any | Adenot; Tone.js; spec issue #368 | No Quest CPU measurement |
| Reverb | 1 shared convolver, ≤1.5–2 s procedural IR; RT60 = 0.161·V/A clamped 0.3–2.0 s | Sabine; Adenot; Tone.js Reverb | 3 convolvers not advised |
| Scheduler | 100 ms look-ahead, 25 ms tick | Wilson; Tone.js 0.1 s | — |
| latencyHint | 'playback' or ~0.05 s if glitches | kanejaku; Chromium Android issue | Adds output latency |
| Flashing | ≤3 flashes/s anywhere | WCAG 2.3.1 | — |
