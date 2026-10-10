# Competitors, references and prior art for Roomsong

Research date: 2026-10-10. Scope: products/projects that are the same as or closely related to Roomsong (hands-first MR music garden on a real table; position = timing/pitch; "room tunes the music"). Every product below was checked against at least one primary page (store listing, official site, Devpost page, repo, paper). Store ratings are point-in-time snapshots from the page or mirror cited; where two mirrors disagree both values are given. Items that could not be verified are flagged "unverified" and listed under Gaps.

Conventions used in this file:
- **Genuine MR** = runs on a headset with passthrough/scene understanding and places content in the user's real room. **3D-on-screen** = phone/tablet/desktop/DS. **VR-only** = headset but no passthrough. "Immersive" in marketing copy is ignored unless the store page lists MR support.
- The web-search budget for this session ran out before the last three planned searches (listed in the final Gaps section), so a small number of items remain unverified.

---

## Key question 1 — Brian Eno & Peter Chilvers: Bloom (2008), Bloom: 10 Worlds (2018), Bloom: Open Space (2018, HoloLens)

### Takeaway
Bloom is the canonical "tap a note, it loops and mutates" generative-music toy; Bloom: Open Space (Amsterdam, Feb 2018) already put that exact mechanic into hands-only mixed reality on HoloLens with networked multi-user play — so "plant-a-note-it-loops in MR with bare hands" is prior art from 2018, but it never shipped as a consumer app and did not use room geometry to shape the music.

### Cited Findings
- Bloom (iOS) launched 7 October 2008; tapping adds tones shown as circles that loop continuously; the app takes over when the user is idle; 12 "mood" settings; adjustable delay; shake to clear — [Wikipedia: Bloom (software)](https://en.wikipedia.org/wiki/Bloom_(software))
- Pitch mapping: "the higher up the screen, the higher the note"; the same spot produces the same note; taps "turn into patterns that transform themselves when the system is idle, rather than repeating indefinitely" — [Create Digital Music hands-on, 2008](https://cdm.link/hands-on-with-bloom-new-generative-iphone-app-by-eno-and-chilvers/); [Gizmodo 2008](https://gizmodo.com/brian-enos-bloom-raises-the-bar-for-musical-iphone-apps)
- App Store (original Bloom, Opal Limited): $3.99, 4.8/5 from 99 ratings, v3.2 (19 Sep 2023), 18.3 MB, runs on iOS 15+, Apple-silicon Mac and visionOS 1.0+ (as a compatible iPad app) — [App Store: Bloom](https://apps.apple.com/us/app/bloom/id292792586)
- Bloom: 10 Worlds (2018 anniversary edition): $7.99, 4.3/5 from 65 ratings, 10 worlds that unlock automatically with new sounds/shapes/rules; interactive and passive modes; v1.1 (22 Feb 2019); iOS 11+, Mac, visionOS 1.0+ — [App Store: Bloom: 10 Worlds](https://apps.apple.com/app/id1438214016)
- Reception: Gizmodo called the 2008 app "The First Great iPhone App"; The Guardian: "hypnotic and ludicrously addictive"; Artforum's Damon Krukowski felt "like the Terry Riley of the iPhone" — [Wikipedia](https://en.wikipedia.org/wiki/Bloom_(software)); [Artforum](https://www.artforum.com/columns/brian-eno-and-peter-chilverss-bloom-190053/)
- Eno/Chilvers app family on the official site: Bloom, Bloom: 10 Worlds, Reflection, Trope, Scape, Air, Quarta (no prices or dates listed on that page) — [generativemusic.com](https://generativemusic.com/)
- Trope (2009) is "darker in tone… tracing abstract shapes onto the screen"; Scape (2012, iPad-only) ships with an album's worth of Eno/Chilvers material — [TechRadar](https://www.techradar.com/news/world-of-tech/software/applications/brian-eno-releases-ambient-app-follow-up-637367); [Engadget 2012](https://www.engadget.com/2012-10-01-scape-creates-new-age-music-on-your-ipad.html)
- **Bloom: Open Space** — mixed-reality installation, Transformatorhuis, Westergasfabriek, Amsterdam, 21–25 Feb 2018 — [enoshop.co.uk](https://www.enoshop.co.uk/BloomOpenSpace)
- Interaction: visitors wearing HoloLens "use a pinching gesture with thumb and forefinger to create 3D colored spheres that produce audible tones"; each participant gets a unique colour and sound; blooms expand then disappear; sounds "randomly combine with other generated blooms"; 10–15 HoloLens wearers networked in an inner circle, 20+ more watching on floor-to-ceiling screens; built in Unity; Chilvers: "you're not really listening to a piece, you're walking through the piece" — [Microsoft News feature](https://news.microsoft.com/features/brian-eno-peter-chilvers-create-quite-magical-flower-garden-sound-amsterdam-bloom-open-space/)
- Scale/reception: 1,000 ticketed guests, more than 200 turned away (sold out); part of Microsoft's "Music x Technology" programme — [Microsoft News feature](https://news.microsoft.com/features/brian-eno-peter-chilvers-create-quite-magical-flower-garden-sound-amsterdam-bloom-open-space/); entered at Cannes Lions (Brand Experience & Activation) — [Love The Work / Cannes Lions](https://www.lovethework.com/work-awards/campaigns/bloom-open-space-396765)
- Hands-on: users created notes "by pinching the air in front of their faces"; moving through the space you hear "a completely different version of the composition"; Chilvers framed it as "filtered reality… simplifying the world rather than cluttering it"; Eno: "Imagine if composing could be more like gardening than architecture. You do control the input, but you don't control the output" — [Gizmodo 2018](https://gizmodo.com/the-first-great-iphone-app-grows-up-1823294125)
- Microsoft's piece says it took "half an hour to get Eno's and Chilvers' plan implemented onto a HoloLens device" (Patrick Sebring) — [Microsoft News feature](https://news.microsoft.com/features/brian-eno-peter-chilvers-create-quite-magical-flower-garden-sound-amsterdam-bloom-open-space/)

### Inferences
- Bloom's core loop (one gesture = one note, pitch from position, automatic loop + mutation, idle = generative) is the design pattern Roomsong's "plant a seed, tide plays it" descends from. Judges who know Bloom will see Roomsong as "Bloom on a table" unless the room signature and the garden rules (growth, seasons, daily seed) are visibly doing work in the first minute.
- Open Space proves pinch-in-air MR note placement is intuitive for first-time users, but it was tethered to a curated venue, screens and staff; nothing about it used the room's shape. The ephemeral, no-save stance (also Electroplankton's) is an aesthetic choice Roomsong deliberately inverts with local save and daily growth — that is a legitimate differentiator for "Reason to Come Back".
- Bloom's loop never "repeats indefinitely"; it mutates. Roomsong's 16-step ring is a stricter sequencer. Consider borrowing Bloom's slow mutation (drift, decay) to avoid the "wallpaper loop" fatigue reviewers note in rigid sequencers.

### Gaps
- No download or revenue figures for Bloom were found in any source (Wikipedia explicitly has none).
- Who built the HoloLens software for Open Space (studio/partner) is not named in the sources fetched; the hololens.reality.news article returned HTTP 403.

---

## Key question 2 — Blooming Conductor (Meta Quest, InfiNutshell Studio / Chenyi Faye Fei)

### Takeaway
Blooming Conductor is the closest shipped-or-announced competitor by description ("conduct a living musical garden with bare hands, MR mode in your real room"), but the store listing frames it as a **rhythm game with songs and difficulty modes**, not a free-form sequencer; it is "coming soon" with no reviews, so there is no user-sentiment data yet.

### Cited Findings
- Store copy: "a cozy, controller-free VR music game where your bare hands make nature bloom… poke to spark growth, wave to guide swaying vines, raise your palms to summon soaring melodies"; "100% hand tracking"; "mixed reality mode to grow your garden in your real room via passthrough"; companion "Sprouty"; "no fail states and nothing to grind" — [Meta Horizon Store listing (as surfaced in search)](https://www.meta.com/experiences/blooming-conductor/28179683564955723/)
- Store metadata: developer/publisher **InfiNutshell Studio**; genres **Rhythm, Simulation**; "Comfortable"; Quest 3S/3/Pro/2; single user; Sitting/Standing/Roomscale; **Alpha has two songs with distinct environments and four mode combinations (Easy/Hard × Free Hands/Assigned Hands)**; garden-building with seed collection and plant nurturing; internet required; release window "Autumn 2026"; no reviews — [Meta Horizon Store (en-gb)](https://www.meta.com/en-gb/experiences/blooming-conductor/28179683564955723/)
- Release-date conflict: one search summary of the store page said "coming soon in August 2026"; the fetched en-gb page says "Autumn 2026"; the A MAZE 2025 submission page says "full game launches 2025 on Meta Quest Store and Steam VR" — [Meta Horizon Store](https://www.meta.com/en-gb/experiences/blooming-conductor/28179683564955723/); [A MAZE. Berlin 2025 submission](https://2025.amaze-berlin.de/submissions/blooming-conductor/)
- A MAZE. Berlin 2025 submission: developer Chenyi Faye Fei (China); "Casual, Rhythm, Mixed Reality, Hand Tracking"; described as "a serene, immersive alternative" to quick-move rhythm games; players "garden these creatures to unlock new narratives and maps"; demo available; links infinutshell.studio — [A MAZE. Berlin 2025](https://2025.amaze-berlin.de/submissions/blooming-conductor/)
- No press reviews, trailers on third-party press, or Devpost entry were found in the searches run ("Blooming Conductor" review/trailer/devpost 2026) — searches returned only store mirrors and the A MAZE pages.

### Inferences
- "Two songs", "Easy/Hard" and "Assigned Hands" strongly suggest a cue-following rhythm structure (the user conducts pre-written songs) rather than a composition instrument. Roomsong's clear point of difference is that **the user authors the music** and the garden is the score. This should be said explicitly in the Devpost copy.
- Blooming Conductor's gesture vocabulary (poke, wave, raised palms) is broader than Roomsong's pinch-centric set; broad vocabularies are harder to teach in five minutes and riskier under tracking loss (see Table Troopers' "all you need is pinch").
- Because it is unreleased, judges may not have played it; but its store page exists, so claims of "first hands-only MR music garden" would be false. Phrase Roomsong's novelty around **position = timing/pitch on a real table** and **room signature**, not "first musical garden".

### Gaps
- Engine/stack unverified (search snippet speculated Unity; no primary confirmation).
- Whether Blooming Conductor is an entrant in the 2026 Meta VR Start Developer Competition could not be checked: the 2026 Devpost gallery is unpublished ("The hackathon managers haven't published this gallery yet"), with 2,753 participants and a 18 Nov 2026 deadline — [Devpost 2026 gallery](https://start-developer-competition-26.devpost.com/project-gallery)
- The A MAZE award page (2025.award.amaze-berlin.de/node/9741) could not be fetched (TLS certificate mismatch); any award/nomination status is unverified.

---

## Key question 3 — LuminaMR (Meta Quest, Early Access)

### Takeaway
LuminaMR is a free, early-access, hands-only MR "garden on your ceiling" built on Unity + Presence Platform (passthrough, scene understanding, hand tracking); sound is reactive (soundtrack shifts in "Gazing" mode) but it is not a music instrument and it has only one store rating.

### Cited Findings
- Store: Free; Early Access; category Fitness & wellness; 3+; 5.0 stars from 1 review; seeds spawn on the room's walls, pinch to grab (near or far), merge seeds, throw at ceiling to create islands/plants; plants grow faster while observed and wither in absence; harvest with both palms toward the plant; Building vs Gazing modes "affect your room's atmosphere, color, sound, and growth rate"; "the main soundtrack also changes to enhance the player's viewing experience"; NPC companion doubles as menu — [Meta Horizon Store: LuminaMR](https://www.meta.com/en-gb/experiences/luminamr/8586749284736650/)
- Devpost page: Unity 2022.3.22f1; Presence Platform passthrough with colour LUTs, spatial anchors, scene understanding, depth occlusion, hand tracking, Interaction SDK; Audio SDK spatial sound with custom reverb/gain; challenges included "hand pose detection conflicts (particularly between grabbing and summoning gestures)"; inspirations: *Wrapped* (2014), Journey, Flower, ABZÛ; "Skychology" concept — [Devpost: Lumina MR](https://devpost.com/software/negative-leap-second)
- Mirrors: [vrdb.app](https://vrdb.app/game/8586749284736650), [queststoredb](https://queststoredb.com/app/luminamr-8586749284736650/)

### Inferences
- LuminaMR validates several Roomsong mechanics on Quest hardware: pinch-to-grab (near and far), "attention accelerates growth", withering on absence, and a companion that is also the menu. Its documented pain point — gesture conflicts between grab and a second gesture — is a direct warning for Roomsong's pull-to-grow vs drag-to-move distinction.
- A single review after months in early access suggests discoverability, not quality, is the limiting factor for small hands-only MR wellness apps; a competition entry needs a visible hook (Roomsong: "your room tunes the music").

### Gaps
- Which hackathon the Devpost page belongs to is not stated on the page; team names not listed. Its Devpost URL appeared alongside Presence Platform Hackathon Seoul 2024 projects in a Devpost search, but this is not confirmation.
- Release date and developer name are not shown on the store page fetched.

---

## Key question 4 — Quest / headset music-creation apps (Inkphony, (m)ORPH, OpenSoundLab, Tranzient, Musicone, Paradiddle, Virtuoso, Electronauts, Symphoni, HandJam, Synth Riders; "Patterns" not found)

### Takeaway
Most shipped headset music apps are controller-first studios or rhythm games; the genuinely hands-first MR ones are few (Tranzient, Symphoni, HandJam, OpenSoundLab in part), and the 2025 Start-competition winner Inkphony makes "everything around you an instrument" via **object detection + stylus**, not room geometry. No shipped Quest music app derives key/tempo/mode from the room.

### Cited Findings
**Inkphony (2025 Best Lifestyle Experience winner)**
- Winner, Best Lifestyle Experience ($100K), Meta Horizon Start Developer Competition 2025, by Lucas Martinic, Tejas Shroff & Nadja Pirchheim: "everything around you becomes an instrument that you can use to make music and learn composition" — [Meta Developers blog: winners](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)
- Devpost: MR "musical sketchpad" for Quest 3/3S **using the Logitech MX Ink stylus**; place digital staffs on physical surfaces, tap to create notes, chain/stack notes into melodies/chords, playback with selectable instruments; "AI-powered instrument extraction" uses Meta Passthrough Camera Access + Gemini (object detection) + ElevenLabs (sound generation) to turn surrounding objects into instrument tones; Unity/C#, Meta SDK, MX Ink SDK; roadmap: save/load, multi-track, sharing/remix; "ramping up for public launch on the Meta App Store" — [Devpost: Inkphony](https://devpost.com/software/inkphony-the-world-is-your-instrument)
- The Devpost page does not say that room layout affects pitch, tempo or key — [Devpost: Inkphony](https://devpost.com/software/inkphony-the-world-is-your-instrument)

**(m)ORPH / (m)ORPH Mixed Reality Music Experience (Kasson Crooker)**
- Honorable Mention, Best Entertainment Experience, 2025 competition — [Meta Developers blog](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)
- Store: "not a game"; interact with spatial audio in real time to create "a dynamically evolving music environment"; 15 ambient/experimental songs by named artists; 3.7 stars from 15 reviews; Quest 3S/3/Pro; creator spent over a decade at Harmonix (Guitar Hero, Rock Band, Dance Central) — [Meta Horizon Store: (m)ORPH](https://www.meta.com/experiences/morph/5857833644234313/)
- Original Morph released 2021 on SideQuest (donations), then itch/Steam — [UploadVR 2021](https://www.uploadvr.com/ex-harmonix-dev-releases-abstract-vr-music-experience-morph-on-quest/); [SideQuest](https://sidequestvr.com/app/1952/morph-music-vr-experience)

**OpenSoundLab (Sphericals / Ludwig Zeller)**
- Judges' Choice ($30K), 2025 competition — [Meta Developers blog](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)
- Fork of Logan Olson's SoundStage VR; "modular sound patching three dimensional in a mixed reality experience" using passthrough; 30+ modules; load/record samples; local co-op up to 10; WAV export 48 kHz/24-bit; "Mixed-reality passthrough without Guardian"; real-world depth occlusion via Depth API; Unity; licences OSLLv1/Apache 2.0; 69 GitHub stars; new APK binaries no longer published on GitHub (store instead) — [GitHub: OpenSoundLab](https://github.com/ludzeller/OpenSoundLab)
- Store mirror: $15.99 early-access price; developer Sphericals; Quest 2/Pro/3/3S; full version expected 2026 (page lists 4 Feb 2026); no ratings shown — [queststoredb: OpenSoundLab](https://queststoredb.com/app/opensoundlab-5190305347733325/)
- Academic evaluation (Zeller & Leisi, *Organised Sound*, 6 Apr 2026): three artists used Quest 3 for ten weeks with PatchWorld and OSL; spatiality/tactility and flow transferred well; limitations: performance degradation with complex patches, frame drops in collaboration, Horizon OS interruptions during live sets, "tracking errors in large, brightly lit spaces", platform ephemerality — [Cambridge: Modular observers](https://www.cambridge.org/core/journals/organised-sound/article/modular-observers-opensoundlab-and-patchworld-as-case-studies-for-emerging-practices-of-modular-synthesis-in-extended-realities/78178E780CB182CAD92F7987346222FC)

**Tranzient (AliveIn Tech)**
- Released 7 Dec 2023; $19.99 (seen on sale $9.99); 5.0 stars from 4 ratings; "Full hand-tracking support" and controllers; "mixed reality passthrough"; step sequencer that can "trigger anything in your world… edit steps with swing quantization"; 250+ synth sounds; auto time-stretch/pitch-shift loops; Standing/Sitting/Room-scale — [queststoredb: Tranzient](https://queststoredb.com/app/tranzient-6069863423110286/); [MusicTech](https://musictech.com/news/aliveintechs-tranzient-app-lets-you-make-beats-in-a-cool-vr-setting)

**Musicone (fantamagico, itch.io prototype)**
- "A 3D multiplayer music sequencer" where notes are eggs/eggplants placed on a **circular score**; "the note sequence is given by the proximity to the center of the circle" (closest sound first); inspired by NodeBeat; v0.1 devlog 30 Nov 2022 (APK); still "in development"; download "coming REALLY SOON in the next few years" — [itch.io: Musicone](https://fantamagico.itch.io/musicone); [devlog v0.1](https://fantamagico.itch.io/musicone/devlog/458040/v01)

**Paradiddle, Virtuoso, Electronauts, Synth Riders (controller-first references)**
- Paradiddle: 4.4★ from 490 reviews (vrdb) / 4.5★ from 455 (another mirror); $19.99; released 16 Nov 2023; Tanirgan Studios; controllers listed, MR supported — [vrdb: Paradiddle](https://vrdb.app/game/paradiddle/5719805344724551)
- Virtuoso: 4.3★ from 345 reviews (vrdb) / 4.4★ from 334; $19.99; 10 Mar 2022; Really Interactive / Fast Travel Games; controllers; MR supported — [vrdb: Virtuoso](https://vrdb.app/game/4705981139481778); colour-passthrough update noted by [UploadVR](https://www.uploadvr.com/quest-pro-mixed-reality-apps/)
- Electronauts: 3.7★ from 159 reviews; $19.99; 6 Jun 2019; Survios; controllers only; no MR — [vrdb: Electronauts](https://vrdb.app/game/2022341094553436)
- Synth Riders: 4.7★ from 3,128 ratings (83% five-star) — [vrdb: Synth Riders](https://vrdb.app/game/2436558143118760)

**Symphoni (techToy Studio) and HandJam**
- Symphoni: hands-only conductor rhythm game (two batons controlled with thumb and index finger), MR that "gradually materializes" a virtual environment in sync with music; 16 classical pieces; launched 6 Mar 2025 at $11.99 (Quest 2/3/3S); 4.9-star average from only 66 ratings — [MIXED hands-on](https://mixed-news.com/en/symphoni-hands-on-meta-quest-3/)
- HandJam: space divided into instrument zones; move hands to switch instruments; simple loop station; hands or controllers — [HandJam site](https://sites.google.com/view/hand-jam); [Meta Store: HandJam](https://www.meta.com/en-gb/experiences/handjam/34941804842133958/)

**"Patterns"**
- No Quest app named "Patterns" matching a generative-loop/hand-tracking description was found (search: "Patterns" Quest generative music loops hand tracking returned HandJam, Tranzient, Trippy Fingers only) — treat as not found.

### Inferences
- The two 2025 music winners (Inkphony, OpenSoundLab) both lean on *tools* (stylus, modular patching) and *AI/camera* novelty; neither is a cozy, seated, ≤10-minute "toy". Roomsong's lane — instrument-free, theory-free, seated, table-scale — is open among winners, but it must still show a technical hook judges can name (room signature).
- Review counts show how small the headset music-creation audience is: Tranzient 4 ratings, (m)ORPH 15, Symphoni 66, vs rhythm games in the thousands. For the competition this matters less than for sales, but it argues for making Roomsong *look like* a game (progression, daily seed) rather than a tool.
- OSL's documented failure modes (tracking in bright rooms, OS interruptions, perf with complexity) map directly onto Roomsong's risk register.
- Musicone shows that "circular score, position = time" is an idea indie devs reach independently; Roomsong's ring with 16 steps × 5 pitch rings is a cleaner, more learnable version of it.

### Gaps
- (m)ORPH's input method (hands vs controllers) is not stated on the store page or in UploadVR coverage.
- Inkphony's public store launch status as of Oct 2026 is unverified (Devpost says "ramping up").
- Paradiddle hand-tracking: the vrdb listing shows "Controllers"; a search snippet claimed hand-tracking support — unresolved.

---

## Key question 5 — Classic and screen-based prior art (Electroplankton, Seaquence, Tenori-on, Reactable, NodeBeat, Endel, PlantWave)

### Takeaway
Every element of Roomsong's musical model exists on screens: spatial pitch/time mapping (Tenori-on grid, Bloom), creature/plant sequencers (Electroplankton, Seaquence), proximity-based sequencing (NodeBeat, Musicone), tangible tabletop music (Reactable), and context-reactive generative audio (Endel). What none of them do is read the *physical room* and let it set the musical key/tempo/reverb.

### Cited Findings
- **Electroplankton** (Toshio Iwai, Nintendo DS): Japan 7 Apr 2005, NA 9 Jan 2006, EU 7 Jul 2006; ten plankton "instruments" (Tracy, Luminaria, Hanenbow, Rec-Rec, Nanocarp, Beatnes, Lumiloop, Marine Snow, Sun Animalcule, Volvoice) played via stylus, touchscreen and microphone; scores: Nintendo Power 8.5, Joystiq 8.0, IGN 7.0; the main complaint was "no true way to save"; developers deliberately omitted saving so players enjoy it "viscerally and without preparation" — [Wikipedia: Electroplankton](https://en.wikipedia.org/wiki/Electroplankton)
- **Tenori-on** (Iwai + Yamaha): launched London 4 Sep 2007 at $1,200 / £599; 16×16 LED-button grid; 32-note polyphony, 16-part; design goal to restore "the inevitable relationship between the shape, the sound, and the player"; iOS TNR-i June 2011, TNR-e 2013 — [Wikipedia: Tenori-on](https://en.wikipedia.org/wiki/Tenori-on)
- **Reactable** (Jordà, Geiger, Kaltenbrunner, Alonso; UPF Barcelona): developed 2003–2006; debut concert ICMC 2005; round translucent table, tangibles on the surface operate a modular synth; popularised by Björk's 2007 Volta tour; iOS version late 2010 — [Wikipedia: Reactable](https://en.wikipedia.org/wiki/Reactable)
- **Seaquence** (Okaynokay): originated as a Flash web app in Gray Area's first residency, attracting a community and "upwards of 300,000 compositions"; iOS 2017: creatures swim in a "stereo mixing dish", only the closest are heard; each creature has a step-sequencer; custom physics engine — [CDM](https://cdm.link/seaquence-lets-make-music-animated-ocean-creatures/); [Gray Area press](https://grayarea.org/press/seaquence-growin-groove-petri-dish/)
- Seaquence App Store: free with "Seaquence Complete" $9.99 IAP; 4.6/5 from 81 ratings; v1.3.2 (17 Jan 2023); iOS 11+, Mac, visionOS 1.0+ — [App Store: Seaquence](https://apps.apple.com/us/app/seaquence/id1106270489)
- **NodeBeat** (Seth Sandler & Justin Windle): Octave nodes pulse and send messages to Note nodes within proximity; adjustable gravity/speed/proximity; 20 scales, 12 keys, 7 octaves — [multigesture.net: NodeBeat](https://multigesture.net/projects/nodebeat/); [App Store: NodeBeat](https://apps.apple.com/us/app/-/id1548397820)
- **Endel** (Endel Sound GmbH): soundscapes adapt to "location, environment, and heart rate"; 4.6/5 from 34,000 ratings; free tier plus subscriptions ($2.99–$19.99/mo, $34.99–$119.99/yr, $124.99 lifetime); Apple Editors' Choice; criticism of subscription gating — [App Store: Endel](https://apps.apple.com/us/app/endel-focus-sleep-relax/id1346247457); Apple Watch App of the Year mentioned by [About Amazon](https://aboutamazon.com/news/devices/creating-a-new-world-of-personalized-music-through-ai)
- **PlantWave** (Data Garden): hardware sensors read plant electrical conductivity; "Notes are generated by translating the wave we get from the plant into pitch"; free app + Plus $3.99/mo, Pro $8.99/mo; 4.2/5 from 58 ratings — [App Store: PlantWave](https://apps.apple.com/app/id1509782226); Bluetooth MIDI device — [MIDI.org](https://midi.org/plantwave-uses-wireless-bluetooth-midi-to-let-plants-sing)

### Inferences
- Electroplankton's no-save backlash and Bloom's/Seaquence's save-and-share success suggest that for a competition judged on "Reason to Come Back", persistence (Roomsong's local save + daily seed) is the right call; the ephemeral stance belongs to installations, not apps.
- Seaquence's "only the closest creatures are heard" is a cheap, proven spatial-mix rule Roomsong could reuse in Listen mode (lean closer to a plant to foreground it) without extra UI.
- NodeBeat/Musicone proximity sequencing is harder to read than a ring with discrete steps; Roomsong's 5×16 ring is closer to Tenori-on's legibility, which is the right trade for a 5-minute judge session.
- Endel is the closest "context tunes the music" precedent, but its context is biometric/weather/time; room geometry as the context is not covered by any product found.

### Gaps
- Electroplankton sales figures and Metacritic score were not in the page fetched.
- Scape/Trope current App Store prices and ratings were not fetched (budget); only press descriptions are cited.

---

## Key question 6 — Hackathon and rival 2026 projects (Sound Garden, Orbital Beats, garden-vr, Desk Garden; "Garden of Sounds")

### Takeaway
The nearest hackathon precedent is **Sound Garden (Presence Platform Hackathon Seoul 2024, Utility winner)** — sing a seed, plant it in your real room, it grows into a flower that plays your voice back as an instrument. The two named 2026 rival repos are both *Productivity-track plant/ritual apps without music*; one (Desk Garden) uses Roomsong's exact IWSDK/TypeScript stack. No Devpost project named "Garden of Sounds" was found.

### Cited Findings
- **Sound Garden** — Presence Platform Hackathon Seoul 2024, **Winner, Utility category**; team Chang Min Hur, Jin Lee, Park Wan; user sings into the Quest, voice is converted to an instrument via the kits.ai API, the "vocal seed" is planted in the physical room and grows into a flower that "plays back the recorded voice spatially"; Unity/C#/Blender; hand tracking and room-mesh detection; team notes unresolved hand/controller tracking conflicts when tracking is lost; demo video https://www.youtube.com/watch?v=3yzqUcSDvU4 — [Devpost: Sound Garden](https://devpost.com/software/sound-garden-8nadzg)
- **Orbital Beats** — Meta Quest Presence Platform Digital Hackathon 2024 (182 entries, winners announced 31 May 2024): "Create floating spheres of sound with simple hand gestures" and compose music dynamically (not a category winner; winners were Blobble, Flaivor, Dreamscape) — [MIXED: hackathon 2024 best submissions](https://mixed-news.com/en/meta-quest-presence-platform-hackathon-2024-best-submissions/)
- **xkazm04/garden-vr** — "two calm, hands-first daily-ritual apps" for the Meta VR Start Developer Competition 2026 (**Productivity track**): *Terrarium* (pinch-and-hold breathing; six breaths unfurl a fern) and *Sundial* (watercolour sundial whose shadow follows the real clock); Unity 6.6 URP; PC-first development with keyboard/mouse standing in for gestures; input abstraction for Look/Pinch/PinchHold/Release/Poke/PalmOpen; "honest habits" (no wilting, no streaks); one reward sound per app; seated, two-foot radius, under ten minutes; development "orchestrated by autonomous agents" (two Grok 4.7 agents + a Claude orchestrator); 588 commits; 0 stars; "Vertical slice" phase; licence not chosen — [GitHub: garden-vr](https://github.com/xkazm04/garden-vr)
- garden-vr activity: commits dated 7 Oct 2026 by xkazm04 and "claude" — [GitHub commits](https://github.com/xkazm04/garden-vr/commits/main)
- **najmunnaharhira/Meta-VR-Start-Developer-Competition-2026 ("Desk Garden")** — 2026 competition, Productivity track, New Experience division; "a tiny plant that lives on your real desk"; daily 2-minute ritual (plant an intention, water with your palm, breathe with it); hand-tracking only; seated 2-foot bubble; plant sits on detected table/desk planes and "leans toward windows"; persistent growth/streaks/colour-coded history; high-contrast mode, synthesized audio with captions; **WebXR + Immersive Web SDK (IWSDK), TypeScript, Vite, Node 22.12+, GitHub Pages**; procedural plant; localStorage save; synthesized Web Audio; no third-party assets — [GitHub: Desk Garden](https://github.com/najmunnaharhira/Meta-VR-Start-Developer-Competition-2026)
- Desk Garden activity: 4 commits total — "Initial commit", "Add Desk Garden: hands-first mixed-reality daily ritual (IWSDK)", "Fix hidden buttons rendering, pause ritual on blur, reuse hand array" (5 Oct 2026), merge of PR #1 (6 Oct 2026); 1 star — [GitHub commits](https://github.com/najmunnaharhira/Meta-VR-Start-Developer-Competition-2026/commits/main)
- "Garden of Sounds": Devpost search for "garden of sounds" returned 24 projects, none named "Garden of Sounds" or "Sound Garden" in that result set; a second search for "sound garden quest" surfaced the Seoul 2024 *Sound Garden* above plus unrelated garden apps (Photosynthespace, Innisfree Garden, SproutQuest) — [Devpost search 1](https://devpost.com/software/search?query=garden%20of%20sounds); [Devpost search 2](https://devpost.com/software/search?query=sound%20garden%20quest)
- 2026 competition gallery is not yet published (2,753 participants; deadline 18 Nov 2026) — [Devpost 2026 gallery](https://start-developer-competition-26.devpost.com/project-gallery)

### Inferences
- Neither rival repo competes with Roomsong on music; they compete on the "calm daily ritual on a real desk" *framing* in a different track. Desk Garden's README (seated, 2-ft bubble, captions, high-contrast, procedural everything, IWSDK) reads like the same rubric-driven checklist Roomsong is following — expect many entrants to hit the accessibility/seated boxes, so those are table stakes, not differentiators.
- A repo's commit count is not evidence of a working Quest build (garden-vr is explicitly PC-first with simulated gestures and "progressing toward Quest integration gate"); the same caution applies to Roomsong's own no-headset situation.
- Sound Garden shows that "plant something in your room, it plays back spatially" has already won a Meta hackathon; Roomsong's claim should emphasise *table-scale sequencing with timing/pitch from position* and *room signature*, both absent in Sound Garden.

### Gaps
- Sound Garden's 2024 hackathon was Seoul-specific; its relationship to the global 2024 digital hackathon winners is unclear.
- No Devpost page was found for Orbital Beats (only the MIXED round-up); its mechanics beyond "floating spheres of sound" are unverified.
- Whether either rival repo has produced a Quest-tested build is unknown (no release artifacts cited in READMEs fetched).

---

## Key question 7 — Does ANY shipped app derive music from room geometry? Prior art for "room tunes the music"

### Takeaway
**None found.** No shipped consumer app on Quest, HoloLens, Vision Pro, iOS or Android was found that derives key, mode, tempo or harmony from the room's geometry. The closest items are an academic HoloLens installation (MR4MR, 2022: virtual sound objects bump into *real objects* to seed melodies), an unreleased iOS prototype that sonifies a room's acoustic modes from a LiDAR scan (RoomTone), a 2021 VR art installation that maps a building's surfaces/angles/materials to harmonic properties (ARCHISCORE), and research that uses room geometry for *acoustic rendering* rather than composition (SAMOSA; Apple's audio ray tracing).

### Cited Findings
- **MR4MR: Mixed Reality for Melody Reincarnation** (Kobayashi et al., Keio Univ.; 3rd Conference on AI Music Creativity, 13–15 Sep 2022): HoloLens sound installation; users "bump virtual objects that emit sound against real objects in their surroundings"; melody is continuously created from those collisions and regenerated with music-generation ML models; an installation artwork, not a shipped app — [arXiv 2209.07023](https://arxiv.org/abs/2209.07023); [Zenodo record](https://zenodo.org/records/7088357)
- **RoomTone** (saagpatel, GitHub): iOS LiDAR app that estimates room length/width/height via ARKit plane detection, computes axial/tangential/oblique room modes with f = (c/2)·√((n/Lx)²+(m/Ly)²+(l/Lz)²), and plays up to 16 oscillators at those frequencies with Sabine reverb; Swift/SwiftUI, iOS 17+; prototype, 0 stars, 68 commits, "App Store submission preparation" referenced but unreleased; produces tones, not music — [GitHub: RoomTone](https://github.com/saagpatel/RoomTone)
- **ARCHISCORE / Interpretation 5** (Jiří Suchánek & Martin Dlabaja, Villa Tugendhat, Brno, 2 Nov–5 Dec 2021): "translating selected building parameters (size of surfaces, lines, angles, windows, doors, types of materials…) into spectral and harmonic properties of digitally created sounds" in Max/MSP; the villa's plan becomes a VR "three-dimensional graphic score" and visitor movement triggers segments — [Villa Tugendhat: Interpretation 5](https://www.vilatugendhat.cz/en/akce/interpretace-5-archipartitura/)
- **Extending Xenakis: From Architectural Geometry to Sonification of the Philips Pavilion** (Ma, Wang, Zhu, Smith; submitted 6 Jul 2026, accepted ICMC 2026 Hamburg): nine ruled surfaces → ruling lines → string glissandi; 3,357 sampled points → density-based energy blocks; MIDI rendered in Ableton Live with real-time 3D visualisation; Python research system, not an app — [arXiv 2607.06589](https://arxiv.org/abs/2607.06589)
- **SAMOSA** (ACM 2025): fuses real-time room geometry, surface materials and semantic acoustic context to synthesise a room impulse response — acoustics, not composition — [ACM DL 10.1145/3746059.3747730](https://dl.acm.org/doi/10.1145/3746059.3747730)
- **Hands-On Orchestra: Hand-based Interactive Manipulation of Spatial 3D Audio in Mixed Reality** (ACM 2025) — hands manipulate spatial audio objects in MR; full text returned HTTP 403, so room-geometry use is unverified — [ACM DL 10.1145/3706370.3731713](https://dl.acm.org/doi/10.1145/3706370.3731713)
- **Jamming in MR** (Schlagowski, Gupta, Mertes, Billinghurst, Metzner, André; IEEE VR 2022): remote jamming with a partner's point cloud in MR raised co-presence vs audio-only; no room-to-music mapping — [Univ. Augsburg OPUS](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/95208)
- **Apple Vision Pro**: audio ray tracing "analyzing the features and materials of your space" so sound matches the room — acoustic rendering, not generative composition — [Apple: Vision Pro](https://www.apple.com/apple-vision-pro/)
- **Spatial Vibes** (visionOS): music visualiser with a "Scan Mode" that colours walls/floors/surfaces to the rhythm — visuals from room, not music from room — [App Store: Spatial Vibes](https://apps.apple.com/us/app/spatial-vibes/id6479205174)
- **Music Vision** (SideQuest): audio-reactive visuals overlaid on passthrough — [SideQuest](https://sidequestvr.com/app/47995/music-vision-music-visualizer-for-passthrough)
- **DreamSpace** (Pranay Garg & Shashank Vaibhav): 2025 Best Entertainment winner, "turns any room into stunning, immersive mixed-reality spaces" — a visual room transformation; no evidence of room-derived music — [Meta Developers blog](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)
- **Inkphony** turns *objects* into instrument timbres via camera object detection, not room geometry into key/tempo — [Devpost: Inkphony](https://devpost.com/software/inkphony-the-world-is-your-instrument)
- Meta's own scene-understanding design doc describes classifying walls, floor, ceiling, furniture and windows (the inputs Roomsong's room signature would consume) — [Meta: Scene understanding design](https://developers.meta.com/horizon/design/mr-design-scene/)
- **Architectural Systems Sonification** (NIME 2021 installation) — sonifies automated building *systems*, not geometry-to-music — [NIME 2021](https://nime.org/proc_installations/nime2021_installations_4/)

**Searches tried (all returned no shipped room-geometry-to-music app):**
1. "music generated from room geometry scene understanding mixed reality" (extended)
2. "sonification of room geometry room scan generates music app" (extended)
3. "MR4MR mixed reality music"
4. "Quest scene understanding furniture walls generates music composition app passthrough" (extended)
5. "Vision Pro app music generated from your room geometry spatial" (extended)
6. "architecture sonification building geometry to music NIME"
7. "'your room' becomes music mixed reality app walls furniture melody generative Quest 3" (extended)
8. "room-aware generative music spatial mapping HoloLens OR Quest 3 OR visionOS prototype" (extended)
9. "Jamming in MR real-time music collaboration mixed reality Augsburg"
Two further planned queries ("app generates melody from LiDAR room scan key tempo … ARKit RoomPlan" and "procedural music from scene mesh walls furniture Quest 3 MRUK") could not run because the session's search budget was exhausted.

### Inferences
- "Room signature" (room geometry → key/mode/tempo/reverb, with a tuning ripple that shows which surface made which note) appears to be **novel as a shipped-app feature**. The ideas exist in art/academia (ARCHISCORE, Xenakis sonification, MR4MR) so the claim should be worded as "first in a consumer MR instrument / first on Quest", not "never done".
- The strongest precedents (MR4MR, ARCHISCORE) both make the mapping *legible* — you see the object you bumped, you walk to the wall that sounds. Roomsong's "tuning ripple shows which surface made which note" is the right instinct; without that legibility the room signature is indistinguishable from a random preset and will not score on Innovation.
- Acoustic-rendering work (SAMOSA, Apple) shows judges' mental model: "room affects reverb" is expected; "room affects *harmony and tempo*" is the surprising part. Lead with key/tempo, keep reverb as the obvious supporting layer.

### Gaps
- Hands-On Orchestra and the hololens.reality.news article were inaccessible (403); their content is inferred from titles only.
- Vision Pro App Store and Meta Horizon Store were not exhaustively crawled; a very small or non-English app deriving music from room scans could exist without press coverage. Confidence in "none found": high for Quest (Meta store, SideQuest, press, two hackathon galleries searched), medium for visionOS/iOS.

---

## Key question 8 — What makes hand interaction work in Meta's hands/table exemplars (Hand Physics Lab, Table Troopers, Little Critters)

### Takeaway
Meta's showcased hands-first titles converge on the same rules: start from the technology, teach one gesture (pinch), design for *intent* rather than raw tracking (use positions from before the release, lerp on tracking loss), warn before hands leave the camera view, keep the mechanic simple, and test on-device with strangers. Hand Physics Lab also shows the downside: 3.4 stars from ~2.7K ratings because tracking jitter frustrates players when the design does not forgive it.

### Cited Findings
- **Hand Physics Lab** (Holonautic): 1.3 million copies sold since the 1 Apr 2021 launch; the studio "start[s] with the technology… and through experimentation figure[s] out what a game around this can be"; hybrid of free-form physics and predefined snapping poses; hands "slowly lerp toward real positions rather than teleporting when tracking is temporarily lost"; puzzles designed not to punish minor tracking failures; Meta Horizon Link used for in-editor iteration; principle: "Don't try to be clever with the interaction… Everything around the interaction can be clever, but not the interaction itself" — [Meta success story: Hand Physics Lab](https://developers.meta.com/horizon/discover/success-stories/hand-physics-lab-holonautic/)
- Store: 3.4 stars from 2,689 ratings ("Mixed"; 37% five-star, 21% one-star); $9.99; Hands + Controllers; vrdb lists no MR support — [vrdb: Hand Physics Lab](https://vrdb.app/game/3392175350802835); [Meta Store](https://www.meta.com/experiences/hand-physics-lab/3392175350802835/)
- Road to VR review 5/10: "it's hard to predict when hand-tracking will fail and that lightbulb you tried to screw in for the past five minutes gets launched into the stratosphere"; recommends "small bites" — [Road to VR review](https://roadtovr.com/hand-physics-lab-review/)
- **Table Troopers** (Cosmorama Technologies): "All you need is pinch"; aim uses the hand position from "half a second before release" as the intended target; hands "tint red when fingertips leave camera view"; playable one-handed, colour-blind options; separate physics spaces for the game board and the real room so projectiles can fall off the real table; the table can move mid-game; Early Access 85 min average weekly playtime; 4.8-star rating through first year; Horizon+ inclusion (May 2026) gave 5× MAU and 6× downloads; DLC >50% of revenue; five takeaways: build for platform capabilities, prototype hands-first input before the game, design for intent, simplify mechanics, test on-device with new users — [Meta success story: Table Troopers](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)
- Table Troopers store snapshot: 4.8 stars (172 reviews), ¥1,600 in Japan; official launch out of Early Access 11 Sep 2025 — [MoguraVR](https://www.moguravr.com/?p=274729); hand tracking or controllers; circular rotatable battlefield players gather around — [MIXED interview](https://mixed-news.com/en/table-troopers-cosmorama-interview/); [UploadVR](https://www.uploadvr.com/table-troopers-mixed-reality-strategy/)
- **Little Critters** (Purple Yonder): runner-up Best Casual Game 2025 ("Advanced hand tracking update") — [Meta winners blog](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/); scene tracking turns the real room into the level, depth occlusion lets critters run under tables, hands "slap, squash, throw and poke" — [Road to VR](https://roadtovr.com/?p=173157); [UploadVR](https://uploadvr.com/little-critters-announcement)
- 2025 Best Hand Interactions winners: Hand Survivor, Pocket Lands, Awesome Hand; Best IWSDK: The Nanauts, Dun Jun — [Meta winners blog](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)
- Meta's hands design examples page lists Interaction SDK samples, First Hand, Move Fast and Table Troopers and documents grab, ray, poke and pinch pose detection — [Meta: Hands examples](https://developers.meta.com/horizon/design/hands-examples/)

### Inferences
- Roomsong's gesture set (pinch to plant, pull to grow, drag to move, drag-off to remove) is already "one gesture family"; the Table Troopers evidence says to go further: make pinch the only primitive and derive grow/move/remove from pinch + displacement, with intent inferred from pre-release motion.
- Hand Physics Lab's 3.4-star rating despite 1.3M sales is the clearest warning that hands-only + physics + precision = frustration. Roomsong's targets (0.12–0.30 m ring on a table, 16 steps) need generous snap radii and no physics.
- "Hands tint red when leaving the camera view" is cheap and directly relevant to a seated table-scale app where hands drop below the FoV; adopt an equivalent (fade the tide, show a hint).

### Gaps
- Table Troopers' USD price and global review count were not retrieved (press release 404; only the Japanese store snapshot and the success story).
- Pocket Lands / Hand Survivor / Awesome Hand mechanics were not researched (not music/garden related).

---

## Key question 9 — Competitor / reference matrix

### Takeaway
Across 20+ references, no product combines (a) hands-only, (b) genuine MR on a real table, (c) a legible position = time/pitch sequencer, (d) daily persistence, and (e) room-derived musical parameters; the closest two (Blooming Conductor, Sound Garden) each cover two of the five.

### Cited Findings
Matrix (each row's facts are sourced in the sections above; "MR?" = genuine passthrough MR on a headset).

| Reference | Audience | Core functionality | Interaction | Hardware | Platform/stack (verified?) | Price / access | Reality type | Sentiment (snapshot) | Strengths | Weaknesses / missing | Learn | Avoid copying | Where Roomsong differs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bloom (2008) / Bloom: 10 Worlds | Ambient listeners, non-musicians | Tap = looping, mutating note; idle = generative | Touch | iPhone/iPad (also Mac, visionOS-compatible) | iOS (stack unverified) | $3.99 / $7.99 | 3D-on-screen | 4.8★ (99) / 4.3★ (65) | Zero learning curve; pitch = height; evolves | No persistence of patterns across worlds; flat 2D | One gesture, instant sound, mutation | Pure ambient drift with no goal | Table-scale, seeded garden with growth; room signature |
| Bloom: Open Space (2018) | Ticketed public | Pinch air → bloom + tone; shared composition | Pinch (hands) | HoloLens 1, networked, screens | Unity (verified) | Installation, 1,000 guests | Genuine MR (installation) | Sold out; press positive | Proved pinch-note MR works for novices; social | Never shipped; venue-dependent; no room awareness | "Walking through the piece" spatial mix | Venue-only, staff-assisted onboarding | Consumer app, table-anchored, persistent |
| Blooming Conductor | Cozy-game players | Conduct songs; plants react; garden building | Hands only (poke, wave, palms) | Quest 2/Pro/3/3S | Unverified (store only) | Coming soon (Autumn 2026) | Genuine MR mode (per store copy) | No reviews yet | Hands-only; cozy framing; companion; A MAZE 2025 | Rhythm/song-following (2 songs in alpha); internet required | Cozy tone, companion as guide | Broad gesture vocabulary; song-following | User composes; ring sequencer; room signature |
| LuminaMR | Wellness | Ceiling garden; seeds from walls; gaze accelerates growth | Pinch (near/far), palms | Quest | Unity 2022.3, Presence Platform (verified on Devpost) | Free, Early Access | Genuine MR | 5.0★ (1) | Uses scene understanding + anchors; attention mechanic | Not musical; gesture conflicts | Attention-based growth; companion-as-menu | Ceiling placement (neck strain, FoV) | Table-scale, music-first |
| Inkphony | K-12 music learners | Staffs on surfaces; objects → AI instrument timbres | Logitech MX Ink stylus + hands | Quest 3/3S + MX Ink | Unity/C#, Meta SDK, PCA, Gemini, ElevenLabs (verified) | Not yet on store | Genuine MR | 2025 Lifestyle winner | Camera-AI novelty; education story | Needs stylus; object detection ≠ room geometry; notation-heavy | Legible staff-on-surface; "world is instrument" pitch | Stylus dependency; AI cloud calls | Hands-only; geometry not objects; no theory required |
| (m)ORPH MR | Ambient listeners | Mix 15 artist tracks spatially | Unverified | Quest 3/3S/Pro | Unverified | Store (price not shown) | Store page silent on MR; title says MR | 3.7★ (15) | Artist content; meditative | Listening, not composing | Spatial stem mixing | Dependence on licensed tracks | Composition, procedural audio |
| OpenSoundLab | Experimental musicians | 3D modular synth; co-op 10 | Controllers (hands unverified) | Quest 2/Pro/3/3S | Unity, open source (verified) | $15.99 EA | Genuine MR (Depth API occlusion) | 2025 Judges' Choice | Depth, deep tool | Complex; perf drops with patches; bright-room tracking | Passthrough without Guardian; occlusion | Module complexity | Toy not tool; ≤10 min |
| Tranzient | Producers | Loops, synths, step sequencer, FX | Hands + controllers | Quest 2/Pro/3/3S | Unverified | $19.99 | Genuine MR (passthrough) | 5.0★ (4) | Real hand-tracked step sequencer in MR | Tiny audience; DAW complexity | Swing quantisation; step editing | DAW UI density | Garden metaphor, no DAW |
| Musicone | Hobbyists | Circular score; proximity to centre = order | Unverified | Android VR APK | Unverified | Free prototype, no download | VR | n/a | Circular position = time idea | Unreleased since 2022 | Radial score | Unclear mapping | Discrete 5×16 ring, table-anchored |
| Symphoni | Classical fans | Conduct 16 pieces with hand batons | Hands only | Quest 2/3/3S | Unverified | $11.99 | Genuine MR→VR transition | 4.9★ (66) | Polished MR reveal | Rhythm-following; low visibility | MR materialising in sync with music | Score-chasing | Free composition |
| HandJam | Casual | Instrument zones, loop station | Hands or controllers | Quest | Unverified | Store | VR (unverified MR) | n/a | Zone = instrument | No persistence story | Spatial zones | — | Garden persistence |
| Paradiddle / Virtuoso / Electronauts | Musicians / jam | Drums / instruments / stem jamming | Controllers | Quest | Unverified | $19.99 each | MR supported (P, V); none (E) | 4.4★ (490) / 4.3★ (345) / 3.7★ (159) | Depth, content | Controller-first; not hands | Onboarding lessons (Paradiddle) | Instrument realism | Hands-only, no instruments |
| Synth Riders | Rhythm gamers | Rhythm game | Controllers | Quest | — | Paid | VR | 4.7★ (3,128) | Benchmark for polish/retention | Not creative | Music-synced feedback | — | Creation vs consumption |
| Electroplankton | DS players | 10 creature instruments | Stylus, mic | Nintendo DS | — | Discontinued | Screen | 7–8.5/10 | Playful instrument metaphors | No save (main complaint) | Instant visceral play | No persistence | Save + daily growth |
| Tenori-on / TNR-i | Musicians | 16×16 grid sequencer | Buttons / touch | Hardware ($1,200) / iOS | — | Discontinued HW | Physical / screen | Cult device | Legible grid = time×pitch | Expensive; grid not spatial | Shape↔sound↔player | Dense grid | Ring on a real table |
| Reactable | Performers | Tangible modular synth on a table | Tangibles + fingertips | Custom table / iOS | — | Pro / iOS | Tangible tabletop | Björk-popularised | Table as instrument; social | Needs a special table | Table-centric, circular | Modular complexity | Any real table, hands only |
| Seaquence | Hobbyists | Creature step-sequencers in a dish; nearest heard | Touch | iOS / web | Custom physics (verified) | Free + $9.99 | Screen | 4.6★ (81); 300K web comps | Proximity mix; sharing | 2D | "Only closest heard" | Petri aesthetic | 3D table, room |
| NodeBeat | Hobbyists | Octave/Note nodes by proximity | Touch | iOS etc. | — | Paid | Screen | n/a | Simple generative rules | Hard to read | Scale/key constraints | Physics chaos | Discrete steps |
| Endel | Wellness | Adaptive soundscapes from location, HR, time | None (passive) | Phone/watch | AI (unverified detail) | Subscription | Screen/audio | 4.6★ (34K) | Context-reactive precedent | Passive; subscription gating | "Context tunes music" framing | Subscriptions | Room geometry as context; active play |
| PlantWave | Plant owners | Plant bio-signals → pitch | None (sensor) | Hardware + app | — | HW + sub | Physical | 4.2★ (58) | "Nature plays" story | Needs hardware | Nature-as-musician narrative | Hardware | No hardware; virtual plants |
| Sound Garden (Seoul 2024) | Hackathon | Sing a seed → flower plays voice spatially | Hands (+controllers) | Quest | Unity/C#, kits.ai, room mesh (verified) | Hackathon only | Genuine MR | Utility winner | Plant-in-room music idea; room mesh | Voice/cloud dependency; tracking conflicts | Spatial playback of planted sounds | Cloud API | Table ring; room signature; offline |
| garden-vr (Terrarium/Sundial) | 2026 Productivity entrants | Breathing fern; sundial | Pinch-hold, poke, palm | Quest (PC-first dev) | Unity 6.6 URP (verified README) | Repo | Intended MR | 0 stars | Agent-driven velocity; "honest habits" | No music; no device evidence | One reward sound; no streak guilt | — | Music + room |
| Desk Garden | 2026 Productivity entrant | Daily intention/water/breathe plant on desk | Hands only | Quest | IWSDK/TS/Vite/Pages (verified README) | Repo | Intended MR (planes, windows) | 1 star, 4 commits | Same stack as Roomsong; leans to windows | No music; early | Plane detection + window use as cheap "room awareness" | — | Music; ring; room signature |
| Hand Physics Lab | Hands sandbox | Physics puzzles | Hands (+controllers) | Quest | Unity (success story) | $9.99 | VR | 3.4★ (2,689) | 1.3M sold; design lessons | Tracking frustration | Lerp on loss; forgiving puzzles | Precision physics | Snap targets, no physics |
| Table Troopers | Social strategy | Turn-based on real table | Pinch (hands) or controllers | Quest 2/3 | Meta XR SDK (verified) | Paid + DLC | Genuine MR, table-scale | 4.8★ (172) | Intent inference; red-hand warning; table can move | — | All of the above | — | Music not combat |
| Little Critters | Casual MR | Tower defence in your room | Hands (slap/squash) | Quest 3/3S | Unverified | Paid | Genuine MR (scene, occlusion) | 2025 Casual runner-up | Room as level | — | Occlusion polish | — | Calm not frantic |

### Inferences
- Five-way uniqueness claim (hands-only + table MR + legible sequencer + persistence + room-derived parameters) holds against everything found; it is the sentence to put at the top of the Devpost page.
- The hands-only MR music apps that exist (Symphoni, Tranzient, Blooming Conductor) each have ≤66 ratings or none; the category is unproven commercially, which judges may read as "novel" or "niche" — present retention evidence (daily seed, growth) to counter "niche".

### Gaps
- Prices for (m)ORPH MR and HandJam were not captured; (m)ORPH and OpenSoundLab input methods unverified.

---

## Key question 10 — Prior-art map: which parts of Roomsong's concept already exist

### Takeaway
Every building block of Roomsong exists somewhere, usually on a screen or in an installation; the combination on a real table with hands only, plus room-derived key/tempo/reverb, does not.

### Cited Findings

| Roomsong concept part | Exists? | Closest prior art (with evidence) | Shipped consumer app? | Novelty assessment |
|---|---|---|---|---|
| Radial / step-sequencer garden (ring, steps, pitch rings) | Yes, on screens | Tenori-on 16×16 grid ([Wikipedia](https://en.wikipedia.org/wiki/Tenori-on)); Musicone circular score, proximity to centre = order ([itch.io](https://fantamagico.itch.io/musicone)); Tranzient MR step sequencer ([queststoredb](https://queststoredb.com/app/tranzient-6069863423110286/)); Reactable round table ([Wikipedia](https://en.wikipedia.org/wiki/Reactable)) | Tenori-on, Tranzient yes; Musicone no | Ring-on-a-real-table with pitch rings is a new *arrangement*, not a new idea |
| Plant-a-note-it-loops | Yes | Bloom 2008 ([CDM](https://cdm.link/hands-on-with-bloom-new-generative-iphone-app-by-eno-and-chilvers/)); Bloom: Open Space in MR with pinch ([Microsoft](https://news.microsoft.com/features/brian-eno-peter-chilvers-create-quite-magical-flower-garden-sound-amsterdam-bloom-open-space/)); Sound Garden Seoul 2024 ([Devpost](https://devpost.com/software/sound-garden-8nadzg)); Seaquence ([App Store](https://apps.apple.com/us/app/seaquence/id1106270489)) | Bloom yes; MR versions no | Well-trodden; differentiate by *what* loops (growth stage changes timbre) |
| Hands-only music in MR | Yes (few) | Bloom: Open Space (HoloLens pinch); Symphoni ([MIXED](https://mixed-news.com/en/symphoni-hands-on-meta-quest-3/)); Tranzient hand tracking; Blooming Conductor (announced) ([Meta Store](https://www.meta.com/en-gb/experiences/blooming-conductor/28179683564955723/)); Orbital Beats hackathon ([MIXED](https://mixed-news.com/en/meta-quest-presence-platform-hackathon-2024-best-submissions/)) | Symphoni, Tranzient yes | Not novel; must be *excellent* (Table Troopers-grade intent handling) |
| Musical garden metaphor (plants = notes, growth) | Yes | Blooming Conductor; Sound Garden; LuminaMR (non-musical garden) ([Meta Store](https://www.meta.com/en-gb/experiences/luminamr/8586749284736650/)); Electroplankton Hanenbow leaves ([Wikipedia](https://en.wikipedia.org/wiki/Electroplankton)) | Blooming Conductor pending | Crowded metaphor in 2024–2026 hackathons; garden must *mean* something musically |
| Daily-growth / come-back loop | Yes (non-music) | LuminaMR plants grow with attention and wither in absence; Desk Garden daily ritual and streaks ([GitHub](https://github.com/najmunnaharhira/Meta-VR-Start-Developer-Competition-2026)); garden-vr "honest habits" ([GitHub](https://github.com/xkazm04/garden-vr)) | LuminaMR yes (EA) | Common in 2026 entries; "daily seed" is fine but not a differentiator |
| Room-reactive music (room geometry → key/mode/tempo/reverb) | **No shipped app found** | MR4MR installation (collisions with real objects seed melodies) ([arXiv](https://arxiv.org/abs/2209.07023)); ARCHISCORE (building parameters → harmonics, VR, 2021) ([Villa Tugendhat](https://www.vilatugendhat.cz/en/akce/interpretace-5-archipartitura/)); RoomTone prototype (LiDAR → room-mode tones) ([GitHub](https://github.com/saagpatel/RoomTone)); Xenakis sonification (ICMC 2026) ([arXiv](https://arxiv.org/abs/2607.06589)); acoustics-only: SAMOSA ([ACM](https://dl.acm.org/doi/10.1145/3746059.3747730)), Apple audio ray tracing ([Apple](https://www.apple.com/apple-vision-pro/)) | None | **Novel for a consumer MR app**; defensible as "first on Quest" with the legibility ripple |
| Table-scale, seated, pinch-only MR | Yes | Table Troopers ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)); Little Critters; Desk Garden | Yes | Table stakes; copy the best practices |
| Listen mode (dim room, halo, vines) | Partial | LuminaMR "Gazing" mode changes atmosphere/colour/sound; Symphoni MR→VR materialisation | Yes | Reasonable; not novel |
| Offline, local-save, no cloud AI | Yes | Desk Garden (localStorage, Web Audio); Bloom | Yes | Contrast with Inkphony/Sound Garden cloud APIs is worth stating (privacy, no internet) |

### Inferences
- The only concept part with no shipped precedent is the room signature. It should carry the Innovation score and the "Boldest Original Concept" pitch; everything else should be judged on execution quality (Experience Design, Polish).
- Because "musical garden" is crowded, the first-minute experience must demonstrate room signature *before* the garden metaphor: e.g., the tuning ripple sweeps the real table and walls, then the first seed lands already in the room's key.

### Gaps
- No evidence on how judges reacted to the 2025 music entries beyond their placements; qualitative judge feedback is not public.

---

## Key question 11 — What to learn, what to avoid, where to differentiate (synthesis)

### Takeaway
Learn interaction discipline from Table Troopers/Hand Physics Lab, first-minute magic from Bloom and Symphoni, persistence rules from LuminaMR/Seaquence; avoid rhythm-game framing, broad gesture vocabularies, cloud dependencies and physics-precision hands; differentiate on room signature made legible, user-authored music on a real table, and offline reliability.

### Cited Findings
- "Don't try to be clever with the interaction" and lerp-on-tracking-loss — [Meta: Hand Physics Lab](https://developers.meta.com/horizon/discover/success-stories/hand-physics-lab-holonautic/)
- Pinch-only, intent from pre-release position, red tint when hands leave view, one-handed play, test with new users — [Meta: Table Troopers](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)
- Grab vs summon gesture conflicts were LuminaMR's main challenge — [Devpost: Lumina MR](https://devpost.com/software/negative-leap-second)
- Hand/controller tracking-loss issues unresolved in Sound Garden — [Devpost: Sound Garden](https://devpost.com/software/sound-garden-8nadzg)
- Tracking errors in bright rooms, perf drop with complexity, OS interruptions — [Organised Sound 2026](https://www.cambridge.org/core/journals/organised-sound/article/modular-observers-opensoundlab-and-patchworld-as-case-studies-for-emerging-practices-of-modular-synthesis-in-extended-realities/78178E780CB182CAD92F7987346222FC)
- Bloom's instant-sound, pitch-from-position, mutate-when-idle loop — [CDM](https://cdm.link/hands-on-with-bloom-new-generative-iphone-app-by-eno-and-chilvers/)
- Electroplankton's no-save complaint — [Wikipedia](https://en.wikipedia.org/wiki/Electroplankton)
- Symphoni's MR environment "gradually materializes… perfectly synchronized with the music" praised as a "masterclass in blending realities" — [MIXED](https://mixed-news.com/en/symphoni-hands-on-meta-quest-3/)
- Blooming Conductor positioned as Rhythm/Simulation with Easy/Hard, two songs — [Meta Store](https://www.meta.com/en-gb/experiences/blooming-conductor/28179683564955723/)

### Inferences
- **Learn:** (1) pinch as the single primitive with intent inference; (2) explicit hand-visibility feedback; (3) sound within ~100 ms of the first pinch, no menu first; (4) "only the closest plants are loud" spatial rule; (5) attention/time-based growth with no punishment; (6) MR reveal synchronised to music for the Listen mode.
- **Avoid:** song-following rhythm structure; more than one gesture family; ceiling/wall placement that breaks seated FoV; cloud AI calls (Gemini/ElevenLabs/kits.ai) that need internet; physics hands; dense DAW UI; subscription/IAP framing in a competition build.
- **Differentiate:** room signature with a visible cause→effect ripple; user-authored music (not conducting pre-written songs); table-anchored ring that survives table movement (Table Troopers precedent); fully offline, procedural audio in Web Audio (contrast with Inkphony/Sound Garden); persistence + daily seed with "honest" (non-punitive) growth.

### Gaps
- No public usability data (session length, drop-off) exists for any hands-only MR music app except Table Troopers' 85 min/week (non-music); Roomsong's retention hypotheses must be validated internally.

---

## Source register (compact)

| ID | Title | Org/author | Date | Type | URL | Supports |
|---|---|---|---|---|---|---|
| S1 | Blooming Conductor store page (en-gb) | Meta / InfiNutshell Studio | accessed 2026-10-10 | Store | https://www.meta.com/en-gb/experiences/blooming-conductor/28179683564955723/ | KQ2 |
| S2 | Blooming Conductor — A MAZE. Berlin 2025 submission | A MAZE. / Chenyi Faye Fei | 2025 | Festival page | https://2025.amaze-berlin.de/submissions/blooming-conductor/ | KQ2 |
| S3 | LuminaMR store page | Meta | accessed 2026-10-10 | Store | https://www.meta.com/en-gb/experiences/luminamr/8586749284736650/ | KQ3 |
| S4 | Lumina MR Devpost | Devpost | n.d. | Hackathon page | https://devpost.com/software/negative-leap-second | KQ3 |
| S5 | Inkphony Devpost | Devpost / Martinic, Shroff, Pirchheim | 2025 | Hackathon page | https://devpost.com/software/inkphony-the-world-is-your-instrument | KQ4, KQ7 |
| S6 | Meet the Meta Horizon Start Developer Competition Winners | Meta Developers | 2025 | Blog | https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/ | KQ4, KQ8 |
| S7 | (m)ORPH store page | Meta / Kasson Crooker | accessed 2026-10-10 | Store | https://www.meta.com/experiences/morph/5857833644234313/ | KQ4 |
| S8 | OpenSoundLab repo | ludzeller | accessed 2026-10-10 | Repo | https://github.com/ludzeller/OpenSoundLab | KQ4 |
| S9 | Modular observers: OSL and PatchWorld | Zeller & Leisi, Organised Sound | 2026-04-06 | Journal | https://www.cambridge.org/core/journals/organised-sound/article/modular-observers-opensoundlab-and-patchworld-as-case-studies-for-emerging-practices-of-modular-synthesis-in-extended-realities/78178E780CB182CAD92F7987346222FC | KQ4, KQ11 |
| S10 | Tranzient store mirror | queststoredb | accessed 2026-10-10 | Store mirror | https://queststoredb.com/app/tranzient-6069863423110286/ | KQ4 |
| S11 | Musicone itch page + devlog | fantamagico | 2022-11-30 | Itch | https://fantamagico.itch.io/musicone | KQ4 |
| S12 | Symphoni hands-on | MIXED | 2025 | Press | https://mixed-news.com/en/symphoni-hands-on-meta-quest-3/ | KQ4 |
| S13 | Bloom: Open Space | enoshop.co.uk | 2018 | Official | https://www.enoshop.co.uk/BloomOpenSpace | KQ1 |
| S14 | Eno & Chilvers create flower garden of sound | Microsoft News | 2018 | Corporate press | https://news.microsoft.com/features/brian-eno-peter-chilvers-create-quite-magical-flower-garden-sound-amsterdam-bloom-open-space/ | KQ1 |
| S15 | The First Great iPhone App Grows Up | Gizmodo | 2018 | Press | https://gizmodo.com/the-first-great-iphone-app-grows-up-1823294125 | KQ1 |
| S16 | Bloom App Store | Apple / Opal Ltd | v3.2 2023-09-19 | Store | https://apps.apple.com/us/app/bloom/id292792586 | KQ1 |
| S17 | Bloom: 10 Worlds App Store | Apple / Opal Ltd | v1.1 2019-02-22 | Store | https://apps.apple.com/app/id1438214016 | KQ1 |
| S18 | Bloom (software) | Wikipedia | accessed 2026-10-10 | Encyclopedia | https://en.wikipedia.org/wiki/Bloom_(software) | KQ1 |
| S19 | Hands-on with Bloom | Create Digital Music | 2008 | Press | https://cdm.link/hands-on-with-bloom-new-generative-iphone-app-by-eno-and-chilvers/ | KQ1 |
| S20 | Electroplankton | Wikipedia | accessed 2026-10-10 | Encyclopedia | https://en.wikipedia.org/wiki/Electroplankton | KQ5 |
| S21 | Tenori-on | Wikipedia | accessed 2026-10-10 | Encyclopedia | https://en.wikipedia.org/wiki/Tenori-on | KQ5 |
| S22 | Reactable | Wikipedia | accessed 2026-10-10 | Encyclopedia | https://en.wikipedia.org/wiki/Reactable | KQ5 |
| S23 | Seaquence App Store | Apple / Okaynokay | v1.3.2 2023-01-17 | Store | https://apps.apple.com/us/app/seaquence/id1106270489 | KQ5 |
| S24 | Seaquence lets you make music with animated ocean creatures | CDM | 2017 | Press | https://cdm.link/seaquence-lets-make-music-animated-ocean-creatures/ | KQ5 |
| S25 | NodeBeat | multigesture.net | n.d. | Official | https://multigesture.net/projects/nodebeat/ | KQ5 |
| S26 | Endel App Store | Apple / Endel Sound GmbH | accessed 2026-10-10 | Store | https://apps.apple.com/us/app/endel-focus-sleep-relax/id1346247457 | KQ5 |
| S27 | PlantWave App Store | Apple / Data Garden | accessed 2026-10-10 | Store | https://apps.apple.com/app/id1509782226 | KQ5 |
| S28 | Sound Garden Devpost | Devpost / Hur, Lee, Park | 2024 | Hackathon page | https://devpost.com/software/sound-garden-8nadzg | KQ6 |
| S29 | Presence Platform Hackathon 2024 best submissions | MIXED | 2024 | Press | https://mixed-news.com/en/meta-quest-presence-platform-hackathon-2024-best-submissions/ | KQ6 |
| S30 | garden-vr repo | xkazm04 | commits 2026-10-07 | Repo | https://github.com/xkazm04/garden-vr | KQ6 |
| S31 | Desk Garden repo | najmunnaharhira | commits 2026-10-05/06 | Repo | https://github.com/najmunnaharhira/Meta-VR-Start-Developer-Competition-2026 | KQ6 |
| S32 | 2026 competition project gallery | Devpost | accessed 2026-10-10 | Hackathon page | https://start-developer-competition-26.devpost.com/project-gallery | KQ2, KQ6 |
| S33 | MR4MR | Kobayashi et al., AIMC 2022 | 2022-09 | Paper | https://arxiv.org/abs/2209.07023 | KQ7 |
| S34 | RoomTone repo | saagpatel | accessed 2026-10-10 | Repo | https://github.com/saagpatel/RoomTone | KQ7 |
| S35 | Interpretation 5: ARCHISCORE | Villa Tugendhat / Suchánek & Dlabaja | 2021 | Exhibition page | https://www.vilatugendhat.cz/en/akce/interpretace-5-archipartitura/ | KQ7 |
| S36 | Extending Xenakis | Ma, Wang, Zhu, Smith; ICMC 2026 | 2026-07-06 | Paper | https://arxiv.org/abs/2607.06589 | KQ7 |
| S37 | SAMOSA scene-aware acoustic rendering | ACM | 2025 | Paper | https://dl.acm.org/doi/10.1145/3746059.3747730 | KQ7 |
| S38 | Hands-On Orchestra | ACM | 2025 | Paper (403, title only) | https://dl.acm.org/doi/10.1145/3706370.3731713 | KQ7 |
| S39 | Hand Physics Lab success story | Meta Developers | n.d. | Case study | https://developers.meta.com/horizon/discover/success-stories/hand-physics-lab-holonautic/ | KQ8 |
| S40 | Hand Physics Lab review | Road to VR | 2021 | Review | https://roadtovr.com/hand-physics-lab-review/ | KQ8 |
| S41 | Hand Physics Lab store mirror | vrdb | accessed 2026-10-10 | Store mirror | https://vrdb.app/game/3392175350802835 | KQ8 |
| S42 | Table Troopers success story | Meta Developers | 2026 | Case study | https://developers.meta.com/horizon/discover/success-stories/table-troopers/ | KQ8 |
| S43 | Table Troopers interview | MIXED | 2024 | Press | https://mixed-news.com/en/table-troopers-cosmorama-interview/ | KQ8 |
| S44 | Little Critters launch | Road to VR | 2025 | Press | https://roadtovr.com/?p=173157 | KQ8 |
| S45 | Hands examples | Meta Developers design docs | n.d. | Docs | https://developers.meta.com/horizon/design/hands-examples/ | KQ8 |
| S46 | Paradiddle / Virtuoso / Electronauts / Synth Riders mirrors | vrdb | accessed 2026-10-10 | Store mirrors | https://vrdb.app/game/paradiddle/5719805344724551 ; https://vrdb.app/game/4705981139481778 ; https://vrdb.app/game/2022341094553436 ; https://vrdb.app/game/2436558143118760 | KQ4 |
| S47 | OpenSoundLab store mirror | queststoredb | accessed 2026-10-10 | Store mirror | https://queststoredb.com/app/opensoundlab-5190305347733325/ | KQ4 |
| S48 | Scene understanding design | Meta Developers | n.d. | Docs | https://developers.meta.com/horizon/design/mr-design-scene/ | KQ7 |

Reliability notes: store mirrors (vrdb, queststoredb) are scrapes of Meta's store and can lag; where the official store page was fetchable it was preferred. Devpost pages are self-reported by teams. Press hands-ons are single-reviewer opinions. Repos' READMEs describe intent, not verified device builds.
