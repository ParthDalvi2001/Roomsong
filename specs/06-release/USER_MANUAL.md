# Roomsong: Player Guide

**Status:** Living · **Owner:** product-owner · Checked against `develop` at 3ca3392 on 2026-10-13 (T-167).
The long form of the landing page's Help lines and the source for the "How to test" text of the submission. No task builds a page of its own for it.

*Team note, removed at the feature freeze (12 Nov). Every section and table row carries its state:*
- *`[app]`: in the app today.*
- *`[parts]`: built and tested as a part, in the emulator only; not yet joined into the app (T-128c to T-128e do that).*
- *`[planned T-nnn]`: not on `develop` yet; the task that builds it. Some are being built now.*

*Nothing here has been tried on a headset. Sizes and times come from the code and may change after the headset test (T-129).*

---

## What it is
Roomsong is a small glowing garden on your real table. Every plant sings. Where you plant decides when a plant plays and how high it sounds. You play with bare hands, sitting down. Ten minutes is plenty for a visit.

## What you need
- A Meta Quest 3 or 3S with hand tracking on (Settings, Movement tracking, Hand tracking; *names not yet read off a headset*).
- A table and a seat, with the table top within easy reach.
- A lit room, so the headset can see your hands and the table.
- No controllers, no account, nothing to install.

## How to open it `[app]`
1. Open the Roomsong link in the headset's browser.
2. Wait until "Getting the garden ready." goes away.
3. If you need one, tick a box under **Accessibility**: One hand; No hands: look and hold; High contrast; Reduce motion.
4. Press **Enter the garden** and say yes when the headset asks to share your hands and your room. Sound starts with this press.

You see your real room and hands. Roomsong draws no hands of its own.

## Your first minute `[parts]`, except where marked
1. Look at your table. The **bed** appears on it: a flat glowing ring, 60 cm across, within reach.
2. Light ripples over the table, a wall and the ceiling. Each rings one note: your room is tuning the garden `[planned T-142]`.
3. Hold one hand open, palm up, for half a second. A seed comes to it `[planned T-127: drawing it]`.
4. Pinch the seed with the other hand and carry it over the bed. The place it will land on lights up `[planned T-119, in its fix round]`.
5. Let go. The seed becomes a plant.
6. A sweep of light goes round the bed. When it passes your plant, the plant sings `[planned T-128d]`.
7. Plant your other two seeds. That is your first song.

Round the bed is time: 16 places. Outwards is pitch: 5 circles, low in the middle, high at the edge. All the notes fit together, so nothing you plant sounds wrong.

## Gestures
| Do this | What happens | State |
|---|---|---|
| Open a hand, palm up, for half a second | The next waiting seed comes to that hand. One seed at a time | `[parts]`; seed drawn by T-127 |
| Pinch the seed, carry it over the bed, let go | It is planted on the lit place. If that place is taken, it takes the nearest free one | `[parts]` |
| Let a seed go away from the bed | It goes back to wait for you | `[parts]` |
| Pinch a plant and pull it up or down | Taller is louder and rings longer. Shorter is softer and briefer. 25 cm of hand travel is the whole range | `[planned T-146, T-147]` |
| Pinch a plant and drag it sideways | It moves. Round the bed changes when it plays; in or out changes how high | `[planned T-146, T-147]` |
| Drag a plant past the outer edge, to the side or towards you, and let go | The plant is removed | `[planned T-146]` |
| Pinch the small petal left over that place, within 5 seconds | The plant comes back | `[planned T-146]`; the 5 second rule is `[parts]` |
| Let a dragged plant go over the hole in the middle | It goes back to where it was | `[planned T-146]` |
| Turn the back of your left hand towards your face and pinch the small orb over it | The settings panel opens or closes | `[parts]`, joined by T-128d |
| Hold both palms out, facing away from you, for 1.5 seconds | Listen: the room dims and the garden plays by itself. Any pinch brings you back. It ends by itself after 10 minutes | `[planned T-148]` |

What your pinch will act on lights up first, and nothing changes until you let go. After you pinch a plant, your first 2 cm of movement choose between pulling and dragging.

## Your room tunes the song `[parts]`
*Kept only if the headset test shows the tuning is steady (review of 3 November).*
When the garden finds your table by itself, it measures the room:
- **Floor size sets the key.** A bigger room sings lower.
- **Ceiling height sets the mood:** which five notes the circles play (minor, major, or "sus", an open sound).
- **The room's volume sets the echo.** A large room rings longer.
- **Table and walls choose** your three starting seeds.

The speed is yours; the room never changes it. Another room makes the same plants play a different song.

**No table?** The garden asks where to put it: look at a surface and pinch `[planned T-128c]`. With no pinch in about 10 seconds it places itself, on that surface or floating in front of you. Everything still works. A bed you placed, or a floating one, plays in the "Wanderer" tuning: C major, medium echo.

## Coming back `[parts]`, joined by T-128c to T-128e
- Your garden is saved in this browser, half a second after each change.
- It returns to the same spot on your table. If the headset cannot find the spot, the garden is placed again and your plants are safe.
- Each new day you visit brings one seed. Up to five wait.
- Plants grow leaves after one day, more after three, cream blossoms after seven `[planned T-119, in its fix round]`. Nothing wilts while you are away.

## Settings `[parts]`, joined by T-128d
The settings orb is a small dark disc with three slider lines. It floats over the back of your left hand while that hand's back faces you (your right hand, once **Main hand** is L). Pinch it with the other hand to open the panel. Pinch a control to press it. Close with **x**, or look away for 5 seconds.
- **Sound:** Tempo, Volume, Reverb (auto follows the room; small; off) and "Tuned by", which shows what your room set.
- **Access:** the modes below, and Main hand.
- **Garden:** Bed height (10 cm up or down); Re-place bed, if it landed badly; New garden, which erases this one, so you hold the pinch for 1.5 seconds.

## Accessibility modes
The switches on the first page are `[app]`; the panel's are `[parts]`.
- **One hand.** The settings orb waits in front of you `[parts]`. A seed rests at your fingertips, and one palm is enough to listen `[planned T-160]`.
- **No hands: look and hold.** You aim with your head, not your eyes, and hold the aim on a thing for 0.6, 0.9 or 1.2 seconds to choose it. Works on the settings panel `[parts]`; in the garden `[planned T-160]`.
- **High contrast.** Messages `[app]` and the panel `[parts]` turn cream on black with outlines; plants get outlines `[planned T-119, in its fix round]`.
- **Reduce motion.** Ripples become short glows and growth appears at once `[planned T-142, T-119]`. Nothing reads this switch yet.
- **Beat ring.** Marks on the bed show the beat and each note, for players who cannot hear the song `[planned T-160]`.

Nothing flashes more than three times a second, in any mode `[parts]`.

## Messages
| You see | It means | What to do | State |
|---|---|---|---|
| "Getting the garden ready." | The page is loading | Wait a few seconds | `[app]` |
| "The garden could not load. Reload the page." | The page did not finish loading | Check the connection and reload | `[app]` |
| "Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S." | This browser cannot show virtual things in your real room | Open the link in the headset | `[app]` |
| "The garden did not open. Check that hand tracking is on in the headset: Settings, Movement tracking, Hand tracking." | The headset refused to start. Hand tracking is off, or you answered no | Switch hand tracking on, press Enter again and say yes | `[app]` |
| "Roomsong needs JavaScript. Turn it on and reload the page." | The browser blocks scripts | Allow scripts and reload | `[app]` |
| "Table detection: not available." and "Saved position: not available." (under This device) | The headset did not share the room's layout, or cannot remember spots | Nothing. The garden asks you where to put it or floats, and it is placed again on each visit | `[app]` |
| "Hand out of view" | The headset lost the hand that held something | Bring the hand back in front of you. What you held goes back to where it was. Nothing is lost | `[app]` |
| "Sound unavailable" (5 seconds) | The browser did not start the sound. The garden still works, silent | Check the volume. Leave the garden and press Enter again: sound starts only in that press | `[app]` |
| "Look at your table, and pinch" (Look and hold: "and wait") | No table was found | Look where the garden should go and pinch | `[planned T-128c]` |
| "Table: seeds." "Table: colour." "Walls: colour." "Ceiling: scale." | Labels of the opening ripple: what each surface gives the garden | Nothing | words `[app]`; ripple `[planned T-142]`; colour `[planned T-163]` |
| "Saving unavailable" | The browser cannot store the garden: private browsing, or storage full or blocked | Keep playing; this visit will not be kept. Leave private browsing or free some space, then reload | `[parts]`, shown from T-128e |
| "Open your hand" · "Pinch, and plant it" · "Rest your hands to listen" · "Garden is full" · "Goodnight" | First-visit hints, a full bed (80 plants), and the end of Listen | Follow the hint. For a full bed, remove a plant first | `[planned T-150, T-127, T-148]` |

## Privacy `[app]`
Nothing leaves your headset. No account, no adverts, no tracking. What the headset shares about your room and hands stays on the device. Only the garden and the name of its spot are saved, in this browser: clearing the browser's data deletes them.

## Known limits
- No one has run Roomsong on a headset yet.
- Quest 3 or 3S only, in the headset's browser. No phone or computer version (`[planned T-114]`; may not ship).
- A room near a measuring step can get a different mood or echo on another day: about one room in five, by calculation.
- One garden per browser. It cannot be shared or moved.
- You need a connection to open the page.
