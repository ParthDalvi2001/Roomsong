# Roomsong: Player Guide

**Status:** Living · **Owner:** product-owner · Checked against `develop` at dca03de on 2026-10-17 (states refreshed after T-128d, T-128e, T-114b, T-142b, T-148, T-150, T-160, T-163 and T-164; the pass before was at 9730ef6 on 16 Oct). On 2026-10-23, against `develop` 36dc6cc, the 23 Oct features were added: stillness opens the garden (T-173), the Time-lapse switch (T-174), the vine (T-149), the pause caption (T-152), the guide's new words and the UI sounds (T-164 §6); the other rows are as at dca03de.
The long form of the landing page's Help lines and the source for the "How to test" text of the submission. No task builds a page of its own for it.

*Team note, removed at the feature freeze (12 Nov). Every section and table row carries its state:*
- *`[app]`: in the app today.*
- *`[parts]`: built and tested as a part, in the emulator or on a desktop only; not switched on in the app yet.*
- *`[planned T-nnn]`: not on `develop` yet; the task that builds it. Some are being built now.*
- *`[planned BUG-nnn]`: a known fault, open in BUG_LOG; the fix is not on `develop` yet.*

*Nothing here has been tried on a headset: `[app]` means it works in the emulator, and in laptop mode where the text says so. Sizes and times come from the code and may change after the headset test (T-129).*

---

## What it is
Roomsong is a small glowing garden on your real table. Every plant sings. Where you plant decides when a plant plays and how high it sounds. You play with bare hands, sitting down. Ten minutes is plenty for a visit.

## What you need
- A Meta Quest 3 or 3S with hand tracking on (Settings, Movement tracking, Hand tracking; *names not yet read off a headset*).
- A table and a seat, with the table top within easy reach.
- A lit room, so the headset can see your hands and the table.
- No controllers, no account, nothing to install.
- No headset? A browser on a computer gives you a preview: see **Laptop mode**.

## How to open it `[app]`
1. Open the Roomsong link in the headset's browser.
2. Wait until "Getting the garden ready." goes away.
3. If you need one, tick a box under **Accessibility**: One hand; No hands: look to select; High contrast; Reduce motion. Each is explained under **Accessibility modes**.
4. Press **Enter the garden** and say yes when the headset asks to share your hands and your room. Sound starts with this press.

You see your real room and hands. Roomsong draws no hands of its own.

## Your first minute `[app]`
A guide walks you through it whenever a visit starts on an empty bed: one short caption or one small picture at a time. If you have not done a step after a minute, it moves on without you. A visit that starts with plants on the bed has no guide.
1. Look at your table. The **bed** appears on it: a flat glowing ring, 60 cm across, within reach.
2. Light ripples over the table, a wall and the ceiling, with a short label for each: your room is tuning the garden. Each ripple rings one note of your room's chord, from its own surface.
3. "Open your hand, palm up": hold one hand open, palm up, for half a second. A seed comes to it.
4. "Pinch the seed, drop it here": one place on the bed glows, and a small picture of a pinch opens and closes over it. Pinch the seed on your palm with your other hand and carry it over the bed. The place it will land on lights up.
5. Let go. The seed becomes a plant.
6. A sweep of light goes round the bed. When it passes your plant, the plant sings.
7. Plant your other two seeds. That is your first song.
8. A ring round your newest plant shows how to pull it taller, then how to drag it. Once you have done both (or after 4 minutes): "Show your palms to listen". When the guide is over: "Turn a hand over for settings". Each line shows once.

Your last seed planted, a palm up says "More seeds tomorrow": one new seed comes each day you visit.

Round the bed is time: 16 places. Outwards is pitch: 5 circles, low in the middle, high at the edge. All the notes fit together, so nothing you plant sounds wrong.

## Gestures
| Do this | What happens | State |
|---|---|---|
| Open a hand, palm up, for half a second | The next waiting seed comes to that hand. One seed at a time | `[app]` |
| Pinch the seed, carry it over the bed, let go | It is planted on the lit place. If that place is taken, it takes the nearest free one | `[app]` |
| Let a seed go away from the bed | It goes back to wait for you | `[app]` |
| Pinch a plant and pull it up or down | Taller is louder and rings longer. Shorter is softer and briefer. 25 cm of hand travel is the whole range | `[app]` |
| Pinch a plant and drag it sideways | It moves. Round the bed changes when it plays; in or out changes how high | `[app]` |
| Drag a plant past the outer edge, to the side or towards you, and let go | The plant is removed. While you drag, an arrow on the bed's edge shows the way, until you have removed one | `[app]` |
| Pinch the small petal left over that place, within 5 seconds | The plant comes back. The petal brightens while a fingertip (or your look, with look to select) is on it. The first time, "Pinch the petal to undo" tells you | `[app]` |
| Let a dragged plant go over the hole in the middle | It goes back to where it was | `[app]` |
| Turn the back of your left hand towards your face and pinch the small orb over it | The settings panel opens or closes | `[app]` |
| Hold both palms out, facing away from you, for 1.5 seconds; or pinch the small orb in the middle of the bed | Listen: the room dims, a halo of light breathes round the bed, and the garden plays by itself, the plants nearest you a little louder. It ends by itself after 10 minutes | `[app]` |
| In Listen: turn a palm towards your face, close to it, for about half a second; or pinch | You are back. That pinch does nothing else | `[app]` |
| Hold your head still, looking at the bed, for about 8 seconds | The garden opens: the halo brightens a little, the echo widens, and the plant you look at sings a little louder. Turn your head and it closes. Not in laptop mode | `[app]` |

What your pinch will act on lights up first, and nothing changes until you let go. The seed on your palm does not light up yet `[planned BUG-007]`. After you pinch a plant, your first 2 cm of movement choose between pulling and dragging.

## Your room tunes the song `[app]`
*Kept only if the headset test shows the tuning is steady (review of 3 November).*
When the garden finds your table by itself, it reads the room from what the headset knows about it (your Space Setup):
- **Floor size sets the key.** A bigger room sings lower.
- **Ceiling height sets the mood:** which five notes the circles play (minor, major, or "sus", an open sound).
- **The room's volume, the space it holds, sets the echo.** A large room rings longer. The echo is worked out from the room's size: nothing listens to your room or measures how it really sounds.
- **Table and walls choose** your three starting seeds.

The speed is yours; the room never changes it. Another room makes the same plants play a different song. The labels "Table: a note." and "Walls: a note." name a tint the plants do not show yet `[planned T-163]`.

**A wall near the bed grows a vine** `[app]`: when the headset knows a wall within 1.5 m of the bed, a thin vine in your plants' colours climbs it from the bed's height, over 6 seconds, higher as the bed fills (1.2 m with a full bed). No wall, no vine. With Reduce motion it fades in instead of growing.

**No table?** The garden asks where to put it: look at a surface and pinch (with look to select: look, and wait) `[app]`. With no pinch in about 10 seconds it places itself, on that surface or floating in front of you. Everything still works. A bed you placed, or a floating one, plays in the "Wanderer" tuning: C major, medium echo.

## Coming back `[app]`
- Your garden is saved in this browser half a second after each change, and at once when you take the headset off or close the page.
- It returns to the same spot on your table. If the headset cannot find the spot, or the spot is now out of reach, the garden is placed again and your plants are safe.
- Each new day you visit brings one seed. Up to five wait, in a small ring above the middle of the bed.
- Plants grow leaves after one day, more after three, cream blossoms after seven. Nothing wilts while you are away.
- Take the headset off and the garden pauses: the sound fades out and the garden is saved. Put it back on and it carries on from where it stopped, the sound fading back in; that counts as a visit, so a new day brings its seed. If the browser keeps the sound off, "Pinch to resume sound": pinch, or hold a palm up.
- If the saved garden is damaged, a new garden starts; the old one is kept aside in the browser, not deleted.

## Settings `[app]`
The settings orb is a small dark disc with three slider lines. It floats over the back of your left hand while that hand's back faces you (your right hand, once **Main hand** is L). With **One hand** or **look to select** on, it waits in front of you instead, a little below eye level and to the left (to the right once Main hand is L). Pinch it to open the panel (with look to select: look at it and wait). Pinch a control to press it. Close with **x**, or look away for 5 seconds.
- **Sound:** Speed, Volume, Echo (room follows the room; small; off) and "Tuned to", which shows what your room set.
- **Access:** One hand; Look to select, with its Look time; High contrast; Reduce motion; Beat ring; Main hand.
- **Garden:** a line such as "Day 4, Seeds left 2, Key D major (room)"; Height (10 cm up or down) and **Time-lapse** beside it, a demo of a week of growth, a day every 4 seconds (leaves after 4 s, more after 12, blossoms after 28), nothing of it saved: switch it off, or reload, and your garden is as it was; Place the garden again, if it landed badly; New garden (erases this one), so you hold the pinch for 1.5 seconds.

Laptop mode has no settings panel: the switches on the first page are its settings.

## Accessibility modes
The switches on the first page and in the panel work in the garden `[app]`.

### One hand `[app]`
For playing with one hand.
- **Taking a seed:** hold your hand palm up and a seed lands on it. Pinch with the same hand and the seed comes off your palm. Carry it to the bed and let go. This works when nothing else is within about 4 cm of your fingertips. Nothing on the seed shows yet that it is ready to take `[planned BUG-007]`.
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
| "Table: seeds." "Table: a note." "Walls: a note." "Ceiling: mood." | Labels of the opening ripple, one for each surface found: what it gives the garden. The room does not change the colours yet | Nothing | ripple and labels `[app]`; colour tint `[planned T-163]` |
| "This garden cannot be saved" | The browser cannot store the garden: private browsing, or storage full or blocked. It shows once, during a visit | Keep playing; this visit will not be kept. Leave private browsing or free some space, then reload | `[app]` |
| "Open your hand, palm up" · "Pinch the seed, drop it here" (look to select: "Look at a cell to plant"; laptop mode: "Click or tap to plant") · "Show your palms to listen" (laptop mode: "Click the orb to listen") · "Turn a hand over for settings" | The first-minute guide | Do what it says, or wait: each step moves on after a minute | `[app]` |
| "More seeds tomorrow" | You held a palm up and no seed is left | Shape what you have; a new seed comes each day you visit | `[app]` |
| "Pinch the petal to undo" | Your first removal of the visit; the petal brings the plant back for 5 seconds | Pinch the petal, or let it go | `[app]` |
| "Pinch to resume sound" | After a pause the browser kept the sound off | Pinch, or hold a palm up | `[app]` |
| "Garden full. Remove a plant first." | You let a seed go over a full bed (80 plants) | Remove a plant, then plant the seed | `[app]` |
| "Goodnight" | Listen ran its 10 minutes and ended | Nothing: you are back in the garden | `[app]` |

## Privacy `[app]`
Nothing leaves your headset or computer. No account, no adverts, no tracking. What the headset shares about your room and hands stays on the device. Only the garden, your settings and the name of its spot are saved, in this browser: clearing the browser's data deletes them.

## Known limits
- No one has run Roomsong on a headset yet.
- Made for Quest 3 or 3S, in the headset's browser. On a computer, laptop mode is a preview without your room or your hands `[app]`. Phones and tablets are untested.
- A room near a measuring step can get a different mood or echo on another day: about one room in five, by calculation.
- One garden per browser. It cannot be shared or moved.
- You need a connection to open the page.
- The sound is not final: three new sound styles are built and one will be chosen `[parts]`. Small sounds for a pinch, a bump, a plant, a removal and an undo, made from your room's chord, are built but not yet switched on `[parts]`.
- With look to select, plants cannot be shaped (see its section).
