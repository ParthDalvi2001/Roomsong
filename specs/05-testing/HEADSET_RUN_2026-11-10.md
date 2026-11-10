# Headset run, 10 Nov 2026 (one sitting, about 25 minutes plus 3 for a Space Setup; 2 minutes tomorrow)

**For:** Parth or Chinmay. **Where:** the live site, once Parth has pushed `main`.
**Covers:** every item still open on a headset that the live site can show (TEST_PLAN §4.6 "Still to run",
DECISIONS_PENDING items 4 and 8, BUG-040, BUG-042, BUG-045). What it cannot show is listed at the end.
The order keeps restarts low: five sessions in all, the first on a brand-new garden.

How to fill it: tick ☐ when it happened as written. Write what you saw on the "What happened" line, even on a pass.
Count seconds aloud ("one-and-two...") or ask someone to hold a phone stopwatch.

---

## Before you start (off the headset, 2 minutes)

1. Headset: ☐ Quest 3S (Parth) ☐ Quest 3 (Chinmay). Network: ☐ home Wi-Fi ☐ phone hotspot (better: like a judge).
2. Room 1: the room you scanned in Space Setup, with its table. Room 2 (Part D): another room with **no** scan.
3. Controllers: on a shelf, out of reach, but in the house (Part D needs them).
4. In the headset's browser open `https://parthdalvi2001.github.io/Roomsong/version.json?nocache=1`.
   Write the `commit`: ________ (it should be newer than 4bc6c7c and 5c676b6; Claude checks it).
5. Browser settings → Privacy → **Clear browsing data** (names may differ): tick site data and cached files → Clear.
   This erases the garden on this headset. That is wanted: it is a judge's first visit,
   and tomorrow's Day 2 check needs a garden made today. ☐

---

## Part A. Room 1, the plain link, a brand-new garden (about 9 minutes)

**A1. Cold start, part 1 (T1).** Open `https://parthdalvi2001.github.io/Roomsong/`. Start counting as you tap the link.
Stop when "Getting the garden ready." goes away and **Enter the garden** can be pressed.
Should: 5 s or less. ☐ T1 = ____ s. What happened: ____________________

**A2. Cold start, part 2 (T2).** Pinch **Enter the garden**. Allow hands and room. Start counting at the pinch.
Stop when you see your room with the glowing bed on the table.
Should: 5 s or less. (Which of T1 or T2 the 5 s rule means is still Parth's call: write both.) ☐ T2 = ____ s.
What happened: ____________________

**A3. No message in a scanned room.** Watch the first seconds.
Should: "No room scan" does **not** show. Light ripples over the table, a wall and the ceiling, each with a short label. ☐
What happened: ____________________

**A4. The ceiling caption.** Read the ceiling's label.
Should: "Ceiling: minor mood." (or "major mood." / "open mood."). Write the exact words: ____________________ ☐
Was it easy to read? Rate 1–5: ____

**A5. Tutorial from scratch.** Do only what the captions say: palm up, pinch the seed, drop it on the lit place. Plant all three.
Should: first sound 20 s or less after Enter; three plants playing 90 s or less after Enter.
☐ First sound at ____ s. ☐ Three plants at ____ s. Where did you get stuck? ____________________

**A6. The room colour.** Look at the plants and the bed against your room.
Rate the colour 1–5: ____ (1 = ugly or wrong, 5 = lovely and fits the room). Warm or cool? ________

**A7. Shaping sounds.** Pinch a plant at its head and hold: listen.
Should: one soft **tick** on the pinch. ☐
Still pinching, pull it slowly up, then down. Should: its own **note follows** your hand, softly. ☐
Pinch it again, drag it to the hole in the middle of the bed and let go. Should: one low **bump**; the plant goes back to its place. ☐
Rate the sounds 1–5: ____ ☐ too quiet ☐ right ☐ too loud. What happened: ____________________

**A7b. The music (T-164, listening review #2).** With five or more plants, sit still and listen for one minute.
Rate the music 1–5: ____ (4 or more passes; 1 = boring or harsh, 5 = I would leave it playing). One sentence: ____________________

**A8. A drag by sight.** Hold your hand 15–20 cm short of a plant. Look at the plant past your fingertips. Pinch.
Move your hand and let go.
Should: the plant lights before you pinch; it moves to the place you look at. ☐ Worked first try ____ of 3.
What happened: ____________________

**A9. Remove, then the undo petal.** Pinch a plant and drag it past the bed's outer edge, to the side or towards you. Let go.
Should: the plant is gone; a small petal stays in its place; "Pinch the petal to undo" shows.
Pinch the petal within 5 seconds. Should: the plant comes back in the same place. ☐ Worked first try ____ of 3.
What happened: ____________________

**A10. A hand out of view.** Start dragging a plant, then put that hand behind your back for 2 seconds.
Should: "Hand out of view" shows and the plant goes back to its place; nothing lost or doubled. ☐
What happened: ____________________

**A11. Listen.** Hold both palms out, facing away from you, for 1.5 seconds.
Should: within 2 s the room dims and a halo breathes round the bed. Turn your head left and right:
the sound comes from the plants. ☐ Come back: turn a palm to your face for half a second. ☐
What happened: ____________________

**A12. A 10-second Quest video.** Open the system menu (look at your palm, pinch), Camera → Record video.
Play 10 s with sound, stop it. ☐ Saved with sound? ☐ yes ☐ no. Send it with the results.

**A13. Headset off and on, twice (BUG-040).** Take the headset off for 30 s. Put it back on. Do it once more.
Should: each time the sound fades out, then comes back; the bed is on the same spot; no message. ☐ ☐
Then recentre once (look at your palm, pinch and hold). Should: the bed is back on the table. ☐
If the headset is on USB with the Mac's `chrome://inspect` open: any `E_ANCHOR_RESTORE`? ☐ none ☐ yes, ____ times.
What happened: ____________________

**A14. Exit.** Turn the back of your left hand to your face, pinch the small orb. Garden tab → pinch **Exit**.
Should: you leave the garden, back to the first page. ☐ What happened: ____________________

---

## Part B. Room 1, the frame rate, then one-hand mode (about 5 minutes)

**B1. The garden comes back, with the frame-rate panel.** Open
`https://parthdalvi2001.github.io/Roomsong/?dev=1&flags=perfHud` and pinch Enter. Count from the pinch.
Should: your three plants on the same spot within 4 s. ☐ ____ s, drift ____ cm. ☐ "re-placed" instead.

**B2. Read the frame rate.** A small panel sits low and left in your view. Its top line reads like `90 fps  1.4 ms`;
the second `draws 11  tris 5000`. For one minute pull and drag plants, then Listen (A11).
Read the top number every 10 s. Should: never below 60; typical 72 or more.
☐ Typical ____ fps. Lowest ____ fps. ms ____. draws ____. tris ____.

**B3. Turn on One hand.** Open the panel (orb on the back of your left hand). Access tab → pinch **One hand**. Close (**x**).
Should: the orb now waits in front of you, a little low and to the left. ☐

**B4. New seeds.** Open the panel (pinch the orb in front of you). Garden tab → **hold** a pinch on
"New garden (erases this one)" for 1.5 s. Should: an empty bed with three new seeds. ☐
(This new garden is the one tomorrow's Day 2 check counts from.)

**B5. Seed on the palm, pinch Exit by sight (BUG-042).** Hold one hand palm up until a seed lands on it.
With that hand, open the panel (look at the orb, pinch), then the Garden tab.
Hold your fingers well short of **Exit**, look at it, pinch.
Should: you leave the garden. The seed does **not** jump to your fingers. ☐ What happened: ____________________

---

## Part C. Room 1, no hands at all: look to select (about 4 minutes)

**C1. The no-hands link.** On the first page, open **Accessibility** and untick **One hand**. Then open
`https://parthdalvi2001.github.io/Roomsong/?access=gaze`. Pinch Enter (the page and the prompt need this one pinch).
From now on: **no pinches**. Hands in your lap.

**C2. Plant by looking.** A small cream dot shows where your head points. Rest it on a free place on the bed.
Should: a ring fills round the dot, then a seed is planted there ("Look at a cell to plant"). Plant all three. ☐
What happened: ____________________

**C3. Listen by looking.** Rest the dot on the small orb in the middle of the bed.
Should: Listen starts. Rest it on the orb again (twice as long): you are back. ☐ What happened: ____________________

**C4. Settings by looking.** Rest the dot on the settings orb in front of you. Should: the panel opens. ☐
Look at the Garden tab, then at **Exit**. Should: you leave the garden. ☐ What happened: ____________________

**C5. Turn look-to-select off** (it is saved): on the first page, open **Accessibility**, untick
**No hands: look to select**. ☐

---

## Part D. Room 2, no room scan (about 5 minutes, plus 3 for Space Setup)

No second room? Delete Room 1's scan instead (Settings → Physical space → Space Setup → clear; write the path you used),
do D1–D4 there, then scan it again in D5.

**D1. Controllers held, no scan (BUG-045).** Go to Room 2. Pick up both controllers.
If the headset asks for a boundary, make a stationary one. Do **not** run Space Setup.
Open `https://parthdalvi2001.github.io/Roomsong/?dev=1&flags=perfHud` and press Enter with a controller.
Should: "Put the controllers down" shows. Hold the controllers 20 s and watch the fps panel: it stays steady.
☐ fps while holding: ____. What happened: ____________________

**D2. The no-scan message.** Put the controllers down. Show your hands.
Should: "No room scan: run Space Setup" shows once, for a few seconds. ☐ What happened: ____________________

**D3. Placing with no table found.** Should: a pale bed shows and "Look at your table, and pinch". Look at a surface and pinch
(or wait 6 s: it places itself). Should: the bed lands; your plants are all there; the default song plays. ☐
Where did it land? ☐ table ☐ other surface ☐ floating. What happened: ____________________

**D4. Exit** (panel, Garden tab, **Exit**). ☐

**D5. Space Setup in Room 2.** Settings → Physical space → Space Setup. Scan the room; mark the table. ☐

**D6. After the scan.** Open the plain link `https://parthdalvi2001.github.io/Roomsong/`, Enter.
Should: no "No room scan". Ripples over the table, a wall and the ceiling. ☐
Ceiling caption, exact words: ____________________. Room colour 1–5: ____.
Same garden, two rooms: does it sound different from Room 1? ☐ yes ☐ no. How? ☐ higher/lower ☐ mood ☐ echo ☐ other ____

---

## Part E. Tomorrow (2 minutes, any time after midnight)

**E1. Day 2.** Open the plain link, Enter. Open the panel, Garden tab.
Should: the line starts "Day 2", then "Seeds left 1" (if C2 planted all three). Palm up: a new seed comes. ☐ Exact line: ____________________

---

## Part F. The 10 Nov changes (about 5 minutes, after the next push of main or on the dev link)

**F1. The seed comes at once.** Palm up with seeds left. Should: the seed rests on the palm, no board. ☐
**F2. Throw one back.** Pinch the seed, let go off the bed. Should: it goes back to the supply (Seeds left unchanged). ☐
**F3. The Seeds page.** Free hand palm down, press the orb, Garden tab, Seeds. Pick a kind under Calm. Raise the palm. Should: the seed has that kind's colour and shape. ☐
**F4. The new board.** Look at Sound, Access and Garden. Is each clear? Do "Place again" and "New garden" read? Does the board's lower edge clear the table and the plants? ☐ Rating 1–5: ____
**F5. The hum.** Plant a Thrumsprout (Calm). Rating 1–5: ____ (under 3: it is hidden again)

---

## Not on this sheet (they need something the live site does not have)

- The pinch page and the capability page (TC-DEV-00, TC-DEV-0A): out of the live build (T-189); LAN preview only.
- Ghost mode (`&ghost=1`) and the recorder (`?rec=1`): Parth's dev server only.
- The 10-minute session with 24+ plants (TC-DEV-07), hands hidden mid-pull and with a seed (TC-DEV-09).
- A first-time player (DECISIONS_PENDING 5) and the voice test (RND_2026-11-08 §1).

## How to send the results

Either a photo of each page of this sheet, filled in, or a typed list, one line per step:
`A1 pass 3 s` · `A7 fail: no bump` · `B2 typical 90, lowest 72`. Add the Quest video from A12.
Send them to Parth. Claude puts them into TEST_PLAN §4.6 and BUG_LOG.
