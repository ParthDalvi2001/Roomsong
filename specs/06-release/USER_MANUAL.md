# Roomsong: Player Guide

**Status:** Living · **Owner:** product-owner · Checked against `develop` at f1c4d52 on 2026-11-09: D-061 to D-071, API_SPEC v1.2.54 to v1.2.63, BUG-021 to BUG-043 and the headset runs of 7–8 Nov (TEST_PLAN §4.6), plus items an earlier pass missed (D-060: the 6 s placing wait, the floating bed's tuning, Bring back the old garden; BUG-007: the seed's glow; the Mono switch). The full pass before was at dca03de on 2026-10-17, with the 23 Oct features added at 36dc6cc.
The long form of the landing page's Help lines and the source for the "How to test" text of the submission. No task builds a page of its own for it.

*Team note, removed at the feature freeze (12 Nov). Every section and table row carries its state:*
- *`[app]`: in the app today, tried in the emulator only (and in laptop mode where the text says so).*
- *`[app, headset]`: in the app and also seen working on a real headset: Parth's Quest 3S (7 Nov) or Chinmay's Quest 3 (8 Nov). Only that it works was seen; first-try rates and most timings are not measured yet.*

*Sizes and times come from the code. The full list of what was and was not tried on a headset is in **What was tried on a headset**.*

---

## What it is
Roomsong is a small glowing garden on your real table. Every plant sings. Where you plant decides when a plant plays and how high it sounds. You play with bare hands, sitting down. Ten minutes is plenty for a visit.

## What you need
- A Meta Quest 3 or 3S with hand tracking on (Settings, Movement tracking, Hand tracking; *names not yet read off a headset*).
- A table and a seat, with the table top within easy reach.
- A lit room, so the headset can see your hands and the table.
- No controllers, no account, nothing to install.
- No headset? A browser on a computer gives you a preview: see **Laptop mode**.

## How to open it `[app, headset]`
1. Open the Roomsong link in the headset's browser.
2. Wait until "Getting the garden ready." goes away.
3. If you need one, open the **Accessibility** section (it stays closed until you open it) and tick a box: One hand; No hands: look to select; High contrast; Reduce motion. Each is explained under **Accessibility modes**.
4. Press **Enter the garden** and say yes when the headset asks to share your hands and your room. Sound starts with this press.

You see your real room and hands. Roomsong draws no hands of its own.

To leave, press **Exit** in the settings panel (Garden tab). Your garden is saved, and Enter brings it back `[app, headset]`.

**A link for each mode** `[app]`: add `?access=` and a mode to the Roomsong link: `gaze` (look to select), `onehand`, `contrast` (high contrast) or `reduce` (reduce motion); several with commas, such as `?access=gaze,contrast`. It works like ticking the box: the mode is saved and stays on next time, even from the plain link. A link only turns modes on; turn one off in the panel's Access tab, or untick it on the first page.

## Your first minute `[app]`; steps 3 to 7 `[app, headset]`
A guide walks you through it whenever a visit starts on an empty bed: one short caption or one small picture at a time. The first two steps (palm up, plant) wait for you. From your first plant on, a step you have not done moves on after a minute. A visit that starts with plants on the bed has no guide. On the headsets, three seeds were planted 35 seconds after Enter (Quest 3S) and by 62 seconds (Quest 3); the guide from a brand-new garden has not been run on a headset since the wait was added.
1. Look at your table. The **bed** appears on it: a flat glowing ring, 60 cm across, within reach.
2. Light ripples over the table, a wall and the ceiling, with a short label for each: your room is tuning the garden. Each ripple rings one note of your room's chord, from its own surface.
3. "Open your hand, palm up": hold one hand open, palm up, for half a second. A seed comes to it.
4. "Pinch the seed, drop it here": one place on the bed glows, and a small picture of a pinch opens and closes over it. Pinch the seed with either hand, the other one or the one it rests on, and carry it over the bed. The place it will land on lights up. Lower the seed's hand for about a second and hold the other palm up, and the seed moves across.
5. Let go. The seed becomes a plant.
6. A sweep of light goes round the bed. When it passes your plant, the plant sings.
7. Plant your other two seeds. That is your first song.
8. A ring round your newest plant shows how to pull it taller, then how to drag it. Once you have done both (or after 4 minutes): "Show your palms to listen". When the guide is over: "Turn a hand over for settings". Each line shows once.

Your last seed planted, a palm up says "More seeds tomorrow": one new seed comes each day you visit.

Round the bed is time: 16 places. Outwards is pitch: 5 circles, low in the middle, high at the edge. All the notes fit together, so nothing you plant sounds wrong.

## Gestures
| Do this | What happens | State |
|---|---|---|
| Open a hand, palm up, for half a second | The next waiting seed comes to that hand. One seed at a time | `[app, headset]` |
| Pinch the seed (with either hand), carry it over the bed, let go | It is planted on the lit place. If that place is taken, it takes the nearest free one | `[app, headset]` |
| Let a seed go away from the bed | It goes back to wait for you | `[app]` |
| Pinch a plant at its head (the top you see) and pull it up or down | Taller is louder and rings longer. Shorter is softer and briefer. 11 cm of hand travel, the stem's own height, is the whole range | `[app, headset]` |
| Pinch a plant and drag it sideways | It moves. Round the bed changes when it plays; in or out changes how high | `[app, headset]` |
| Fingers short of a plant or a petal? Look at it past your fingertips and pinch | It is taken as if you touched it. A plant taken this way moves to the place you look at | `[app]` |
| Drag a plant past the outer edge, to the side or towards you, and let go | The plant is removed. While you drag, an arrow on the bed's edge shows the way, until you have removed one | `[app]` |
| Pinch the small petal left over that place, within 5 seconds | The plant comes back. The petal brightens while a fingertip (or your look, with look to select) is on it. The first time, "Pinch the petal to undo" tells you | `[app]` |
| Let a dragged plant go over the hole in the middle | It goes back to where it was | `[app]` |
| Turn the back of your left hand towards your face and pinch the small orb over it | The settings panel opens or closes, as you pinch | `[app, headset]` |
| Hold both palms out, facing away from you, for 1.5 seconds; or pinch the small orb in the middle of the bed | Listen: the room dims, a halo of light breathes round the bed, and the garden plays by itself, the plants nearest you a little louder. It ends by itself after 10 minutes | palms out `[app, headset]`; the orb `[app]` |
| In Listen: turn a palm towards your face, close to it, for about half a second; or pinch | You are back. That pinch does nothing else | `[app, headset]` |
| Hold your head still, looking at the bed, for about 8 seconds | The garden opens: the halo brightens a little, the echo widens, and the plant you look at sings a little louder. Turn your head and it closes. Not in laptop mode | `[app]` |

What your pinch will act on lights up first, and nothing changes until you let go; the seed on your palm brightens when a fingertip is on it. After you pinch a plant, your first 2 cm of movement choose between pulling and dragging.

**Sounds while you shape** `[app]` (not yet listened to, on a headset or off): a tick when you pinch a plant; while you pull, the plant plays its own note at its new height, softly; a tick each time a dragged plant moves onto a new place; a bump when you let it go over the hole in the middle, or anywhere it cannot land.

## Your room tunes the song `[app, headset]`
After a Space Setup scan, the room tuned the song on both headsets (7–8 Nov). Two rooms have not yet been compared by ear on a headset.
When the garden finds your table by itself, it reads the room from what the headset knows about it (your Space Setup):
- **Floor size sets the key.** A bigger room sings lower.
- **Ceiling height sets the mood:** which five notes the circles play (minor, major, or "sus", an open sound).
- **The room's volume, the space it holds, sets the echo.** A large room rings longer. The echo is worked out from the room's size: nothing listens to your room or measures how it really sounds.
- **Table and walls choose** your three starting seeds.

The speed is yours; the room never changes it. Another room makes the same plants play a different song.

**The room also sets the colours and names the mood** `[app]` (not yet seen on a headset): the room's size turns the plants' colours, small rooms warmer (towards gold), big rooms cooler (towards ice and violet); rooms of the same size share a tint. The ceiling's label in the opening ripple names the mood: "Ceiling: minor mood.", "Ceiling: major mood." or "Ceiling: open mood.".

**No room scan?** `[app]` (not yet seen on a headset): if the headset has no scan of the room, "No room scan: run Space Setup" shows once, for a few seconds, and the garden plays its "Wanderer" song. Run Space Setup on your Quest and enter again to let your room tune it. On both headsets, an unscanned room played the Wanderer song; this message was added after those runs.

**A wall near the bed grows a vine** `[app]`: when the headset knows a wall within 1.5 m of the bed, a thin vine in your plants' colours climbs it from the bed's height, over 6 seconds, higher as the bed fills (1.2 m with a full bed). No wall, no vine. With Reduce motion it fades in instead of growing.

**No table?** The garden asks where to put it: look at a surface and pinch (with look to select: look, and wait) `[app]`. With no pinch in about 6 seconds it places itself, on that surface or floating in front of you. Everything still works. A bed you placed, or a floating one, keeps your room's tuning when the headset knows a wall; with no wall known it plays the "Wanderer" tuning: C major, medium echo.

## Coming back `[app]`; save after a reload, pause and resume, the daily seed `[app, headset]`
- Your garden is saved in this browser half a second after each change, and at once when you take the headset off, press Exit or close the page.
- It returns to the same spot on your table. If the headset cannot find the spot, or the spot is now out of reach, the garden is placed again and your plants are safe.
- Each new day you visit brings one seed. Up to five wait, in a small ring above the middle of the bed.
- Plants grow leaves after one day, more after three, cream blossoms after seven. Nothing wilts while you are away.
- Take the headset off and the garden pauses: the sound fades out and the garden is saved. Put it back on and it carries on from where it stopped, the sound fading back in; that counts as a visit, so a new day brings its seed. If the browser keeps the sound off, "Pinch to resume sound": pinch, or hold a palm up.
- If the saved garden is damaged, a new garden starts; the old one is kept aside in the browser, not deleted.

## Settings `[app, headset]`
The settings orb is a small dark disc with three slider lines. It floats over the back of your left hand while that hand's back faces you (your right hand, once **Main hand** is L). With **One hand** or **look to select** on, it waits in front of you instead, a little below eye level and to the left (to the right once Main hand is L). Pinch it to open the panel (with look to select: look at it and wait). Close with **x**, or look away for 5 seconds.

Pinch a control to press it. The panel floats about 55 cm away, so you need not touch it: look at a control past your fingertips and pinch `[app, headset]`. A pinch that starts on a control presses it even if your hand drifts before you let go; New garden is the exception, so you can slide off it to cancel. With a seed on your palm, a pinch aimed at a control presses the control, not the seed `[app]` (not yet tried on a headset).
- **Sound:** Speed, Volume, Echo (room follows the room; small; off), Mono (the same sound in both ears) and "Tuned to", which shows what your room set.
- **Access:** One hand; Look to select, with its Look time; High contrast; Reduce motion; Beat ring; Main hand.
- **Garden:** a line such as "Day 4, Seeds left 2, Key D major (room)". The day counts calendar days, as the daily seed does: a garden made on Monday shows Day 2 on Tuesday, with that day's new seed `[app]` (not yet checked on a headset). Height (10 cm up or down) and **Time-lapse** beside it, a demo of a week of growth, a day every 4 seconds (leaves after 4 s, more after 12, blossoms after 28), nothing of it saved: switch it off, or reload, and your garden is as it was. Place the garden again, if it landed badly, with **Exit** at the end of the same row: one press leaves Roomsong, your garden saved `[app, headset]`. New garden (erases this one), so you hold the pinch for 1.5 seconds; for 10 seconds after, while the new garden is still empty, that row reads "Bring back the old garden" and the same hold brings it back `[app]`.

Laptop mode has no settings panel: the switches on the first page are its settings.

## Accessibility modes
The switches on the first page and in the panel work in the garden `[app]`. On the first page they sit in a closed **Accessibility** section: open it to tick one; its title names the modes that are on. A `?access=` link (see **How to open it**) ticks them for you. Of the modes, only One hand has been tested on a headset (Quest 3, 8 Nov).

### One hand `[app, headset]`
For playing with one hand.
- **Taking a seed:** hold your hand palm up and a seed lands on it. Pinch with the same hand and the seed comes off your palm (this works for every player). Carry it to the bed and let go. This works when nothing else is within about 4 cm of your fingertips. The seed brightens when it is ready to take.
- **Shaping:** pull, drag, remove and undo work as they do with two hands.
- **Listen:** one palm out, facing away from you, for 1.5 seconds, is enough. Or pinch the orb in the middle of the bed.
- **Settings:** the orb waits in front of you, so no second hand has to hold it up (see **Settings**).

### No hands: look to select `[app]`
For playing with no hands at all. You aim with your head, not your eyes.
- A small cream dot shows where your head points. Rest it on something and a ring fills round the dot; when the ring is full, that thing is chosen. You set how long it takes in the panel: **Look time**, 0.6, 0.9 or 1.2 seconds.
- Turning your head pauses the ring; it does not start again from empty.
- One look chooses once. To choose the same thing again, look away and back.
- **What you can do:** place the garden (look at the pale bed and wait: "Look at your table, and wait"); plant (look at a free place on the bed and wait, and a waiting seed is planted there: "Look at a cell to plant"); bring a removed plant back (look at its petal); listen (look at the orb in the middle of the bed); come back from Listen (look at the orb for twice the hold time); use the settings panel (look at a control; New garden still asks for its long hold).
- **What you cannot do yet:** make a plant taller or shorter, move it or remove it. A look at a plant chooses the free place nearest to it.
- The panel blocks the look: while you look at the panel, nothing behind it on the bed is chosen.
- Look to select works only in the headset, not in laptop mode.

### High contrast `[app]`
Messages and the settings panel turn cream on black with outlines; every plant, the seed, the Listen orb, the undo petal and the remove arrow get a thin cream outline, and the room behind dims.

### Reduce motion `[app]`
Ripples become short glows, growth appears at once, and the plants sway half as much.

### Beat ring `[app]`
For players who cannot hear the song. Sixteen small marks lie just outside the bed's edge, one for each place round the ring. The sweep of light lifts each mark as it passes, and a mark lights up more when a plant on its step sings. It is on from the start; switch it off in the panel (Access, **Beat ring**). In Listen it always shows.

Nothing flashes more than three times a second, in any mode `[app]`.

## Laptop mode (no headset) `[app]`
A preview for anyone without a headset: the same garden, sound, guide and save, in a browser tab on a computer. It is not the mixed-reality experience, and it has been tested in one desktop browser only.
1. Open the Roomsong link in a browser on a computer. The first page says "The garden opens in this tab: a click or a tap is a pinch. Height and settings need a headset."
2. If you need them, tick **High contrast** or **Reduce motion**. One hand and look to select are for the headset.
3. Press **Enter the garden**. Sound starts with this press.
4. You look down at the bed on a drawn table, as if seated at it. A seed follows your pointer.
5. Click a free place on the ring to plant the seed ("Click or tap to plant"). The next seed comes 0.4 seconds later.
6. Press a plant and drag to move it; drag it off the ring to remove it; click the petal to bring it back.
7. Click the orb in the middle of the bed to listen ("Click the orb to listen"); click to come back.
8. Leave with **Close the garden** or the Escape key.

What laptop mode does not have: your real room and table (no passthrough); your room's tuning (it always plays "Wanderer": C major, medium echo); hand poses and pulls (no palm up, no palms out, and a plant keeps its height); the settings panel; look to select. Your garden is saved in that browser, apart from the one in your headset.

## Messages
| You see | It means | What to do | State |
|---|---|---|---|
| "Getting the garden ready." | The page is loading | Wait a few seconds | `[app]` |
| "The garden could not load. Reload the page." | The page did not finish loading | Check the connection and reload | `[app]` |
| "The garden opens in this tab: a click or a tap is a pinch. Height and settings need a headset." | This browser has no mixed reality, so Enter opens laptop mode | Press Enter, or open the link in the headset | `[app]` |
| "Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S." | This browser cannot show virtual things in your real room, and laptop mode did not open here | Open the link in the headset | `[app]` |
| "The garden did not open. Say yes when the headset asks, and check that hand tracking is on: Settings, Movement tracking, Hand tracking." | The headset refused to start. Hand tracking is off, or you answered no | Switch hand tracking on, press Enter again and say yes | `[app]` |
| "Roomsong needs JavaScript. Turn it on and reload the page." | The browser blocks scripts | Allow scripts and reload | `[app]` |
| "Table detection: not available." and "Saved position: not available." (under This device) | The headset did not share the room's layout, or cannot remember spots | Nothing. The garden asks you where to put it or floats, and it is placed again on each visit | `[app]` |
| A palm in a dashed ring (an icon) | The headset lost the hand that held something | Bring the hand back in front of you. What you held goes back to where it was. Nothing is lost | `[app]` |
| "No sound. Leave and enter again." (5 seconds) | The browser did not start the sound. The garden still works, silent | Check the volume. Leave the garden and press Enter again: sound starts only in that press | `[app]` |
| "Look at your table, and pinch" (Look to select: "and wait") | No table was found | Look where the garden should go and pinch, or wait | `[app]` |
| "No room scan: run Space Setup" | The headset has no scan of this room, so the garden plays its "Wanderer" song | Run Space Setup on your Quest, then enter again | `[app]` |
| "Put the controllers down" | Controllers are in your hands and no hand is seen | Put them down; Roomsong is played with bare hands | `[app]` |
| "Table: seeds." "Table: a note." "Walls: a note." "Ceiling: minor mood." (or "major mood.", "open mood.") | Labels of the opening ripple, one for each surface found: what it gives the garden. The ceiling's names the mood its height set. The room's size also turns the colours: a small room warmer, a big room cooler | Nothing | ripple, labels and colour turn `[app]` |
| "This garden cannot be saved" | The browser cannot store the garden: private browsing, or storage full or blocked. It shows once, during a visit | Keep playing; this visit will not be kept. Leave private browsing or free some space, then reload | `[app]` |
| "Open your hand, palm up" · "Pinch the seed, drop it here" (look to select: "Look at a cell to plant"; laptop mode: "Click or tap to plant") · "Show your palms to listen" (laptop mode: "Click the orb to listen") · "Turn a hand over for settings" (one hand or look to select: "Look for the settings orb") | The first-minute guide | Do what it says. From your first plant on, a step moves on after a minute | `[app]` |
| "More seeds tomorrow" | You held a palm up and no seed is left | Shape what you have; a new seed comes each day you visit | `[app]` |
| "Pinch the petal to undo" | Your first removal of the visit; the petal brings the plant back for 5 seconds | Pinch the petal, or let it go | `[app]` |
| "Pinch to resume sound" | After a pause the browser kept the sound off | Pinch, or hold a palm up | `[app]` |
| "Garden full. Remove a plant first." | You let a seed go over a full bed (80 plants) | Remove a plant, then plant the seed | `[app]` |
| "Goodnight" | Listen ran its 10 minutes and ended | Nothing: you are back in the garden | `[app]` |

## Privacy `[app]`
Nothing leaves your headset or computer. No account, no adverts, no tracking. What the headset shares about your room and hands stays on the device. Only the garden, your settings and the name of its spot are saved, in this browser: clearing the browser's data deletes them.

## What was tried on a headset
Two headsets so far: a Quest 3S on 7 Nov (on the developer's test server) and a Quest 3 on 8 Nov (on the live site). From TEST_PLAN §4.6.

**Seen working on a headset:** entering with hand tracking; after a Space Setup scan, the room read and the song tuned to it; the palm-up seed, taken by either hand; planting (three seeds 35 s after Enter on the 3S, by 62 s on the 3); pulling a plant by its head and moving it (12 pulls and 6 moves, no hand lost); Listen with both palms out, and coming back; the settings orb, and panel controls picked by looking past the fingers and pinching; Exit and entering again; the garden saved and back after a reload; the pause when the headset comes off, and the resume; the daily seed (Quest 3); One hand mode (Quest 3); about 90 frames a second on both.

**Only in the emulator so far:** the "No room scan" message; the `?access=` links; the closed Accessibility section on the first page; the day count by calendar day; colours by room size and the ceiling's mood label; the sounds while shaping; removing a plant and the undo petal; plants and petals taken by looking past the fingers; a pinch aimed at a control with a seed on the palm; a whole game with look to select; the guide from a brand-new garden; Bring back the old garden; Time-lapse; the vine; the garden opening when you hold still; two rooms compared by ear.

## Known limits
- Made for Quest 3 or 3S, in the headset's browser. On a computer, laptop mode is a preview without your room or your hands `[app]`. Phones and tablets are untested.
- A room near a measuring step can get a different mood or echo on another day: about one room in five, by calculation.
- One garden per browser. It cannot be shared or moved.
- You need a connection to open the page.
- With no table in the room scan, the bed's height came out different on each of three tries on the Quest 3S (0.69, 0.73 and 0.81 m).
- With look to select, plants cannot be shaped (see its section).
