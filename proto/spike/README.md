# Device capability spike (T-104, TC-DEV-0A)

**Status: emulator only. The device run is pending: there is no headset as of 2026-10-10.**

One page that asks Meta Quest Browser what it really supports and shows the answers as a table and as JSON.
Raw WebXR, one WebGL layer that only clears, and Web Audio. No framework. Nothing is sent anywhere: the
results stay in the browser until you copy them.

## Device script (Parth, about 10 minutes)

Before you start: hand tracking is on, Space Setup has been run in this room (ENVIRONMENT_SETUP §5), you sit
at your table, and the controllers are put down.

1. On the Mac, in the repository: `npm run build`, then `npm run preview`. Note the `Network:` address it
   prints (like `https://192.168.1.20:4173/`; if it prints two, take the one of your Wi-Fi, usually `192.168.`).
   Once the site is hosted, use `<site>/proto/spike/` and skip this step.
2. Headset on the same Wi-Fi. In Meta Quest Browser open that address followed by `proto/spike/`.
   With the Mac address a certificate warning is expected: choose Advanced, then Proceed.
   *Not yet checked on a headset.*
3. **Run 1 (allow).** Tap **Start**. Allow everything the headset asks for.
4. You see your room. After about 7 seconds the view turns green: pinch once (thumb and index finger) in
   front of you. You hear a click.
5. Six steps of sound follow, 2 seconds each: 8, 16, 24, 32, 48, 64 voices. Remember the step at which the
   sound starts to crackle, if it does.
6. The session ends by itself (after 45 seconds at the latest, whatever happens). On the page answer the three
   questions: **Which run was this**, **The sound started to crackle at**, **Room permission on this run**.
7. **Run 2 (reload).** Reload the page, tap **Start**, repeat steps 4 to 6. This shows whether the anchor of
   run 1 survived a reload.
8. **Run 3 (restart).** Close Meta Quest Browser completely, open it again, open the page, tap **Start**,
   repeat steps 4 to 6. This shows whether the anchor survived a browser restart.
9. **Run 4 (decline).** Reset this site's permissions (the icon left of the address; the menu names on the
   headset may differ), reload, tap **Start**, and this time decline the room request. Repeat steps 4 to 6.
10. Tap **Copy JSON**. It copies every run kept in this browser. *Not yet checked on a headset.*
11. Paste the text into something you can open on the Mac: a new GitHub issue on the repository, or an email
    to yourself.
12. **If Copy or the paste does not work (no sign-in needed):** connect the headset to the Mac by USB and allow
    USB debugging when the headset asks (Developer Mode on; `adb` from Android Platform Tools installed). In
    Chrome on the Mac open `chrome://inspect/#devices`, click **inspect** under this page, and in the Console
    run `copy(localStorage.getItem('roomsong.spike.runs'))`. The JSON is now on the Mac's clipboard.
    *Meta's remote-debugging route; not yet checked on a headset.*
13. On the Mac, give that text to Claude ("spike results"). Claude records it in ENVIRONMENT_SETUP §9.1.
14. If you have a Quest 3S as well, repeat steps 2 to 13 on it.

Check before you send: in every run `"emulator"` must be `null`. The JSON holds the browser version and the
sizes and heights of the surfaces in your room, and nothing else about you.

Nothing is lost when a run goes wrong: the results are saved after every step and shown again when the page is
opened, a step the browser never answers is given up after 3 seconds with "timed out" as its reason, and
**Start** works again after any ending.

## Reading the results

| Field | Answers |
|---|---|
| `features.granted`, `permission` | What the session granted; how `detectedPlanes` and `detectedMeshes` answer when the room is declined (missing, empty, populated or an error), about 7 s in and at the end |
| `planes.count`, `planes.countAtEnd`, `planes.labels`, `planes.desk`, `planes.samples` | How many planes early and at the end; which semantic labels exist (is there a `desk`?), which way +Y points per surface, the `orientation` value: **gates the room signature** |
| `hands.sources`, `hands.pinchEvents` | Joints per hand; the order of `select`, `selectstart`, `selectend` on one pinch |
| `anchors.restore` | Did the previous run's persistent anchor come back (run 2: reload, run 3: restart) |
| `frameRate` | Rates offered, current rate, fixed foveation and whether a write to it sticks, frames per second of an empty loop over 5 s |
| `audio` | The context's state; latencies; pinch-to-sound (software path only, measured or null, never inferred); per step the audio clock against wall time and the browser's underrun count |
| `human` | What you answered: which run, the crackle step, the room permission |
| `reasons` | Why each `null` is null |

Not measured here: latency from the real finger movement to the sound (needs a camera recording), tracking
quality, and anchor drift. Those are in the device script S1 (T-129).

## On the Mac (emulator)

- `npm run dev:runtime`, then open `https://localhost:8081/proto/spike/` and click Start. The values are the
  emulator's (`"emulator": "IWER 2.5.0"`): they show that the page works, and nothing about a headset.
- Test: `E2E_PORT=8091 npx playwright test 02-spike` (the emulator run, the failure paths, and the built page
  under the Content Security Policy).
