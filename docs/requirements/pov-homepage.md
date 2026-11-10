---
scope: feature
applies_to: [sportin-website]
feature: pov-homepage
status: prototype, not linked from the live site
---

# First-person homepage prototype ("runner to runner")

A scroll-driven homepage hero for sportin.io. The visitor sees one continuous run in first
person. The view starts in Maria's eyes, then flies into the runner ahead of her, and again,
four bodies in all. Each body shows one part of the product as a flat HUD.

Live preview (private artifact, version 21): https://claude.ai/artifact/T9jT6A5Dvvy8yqWijQrBoc
Code: `proto/pov-home/`. Open `proto/pov-home/index.html` from the site root so the
tile videos under `/proto/media/` and `/assets/site/media/` resolve.

## Story, in scroll order

| Scroll (master progress) | Body | What the HUD shows |
|---|---|---|
| 0 – 0.105 | Maria | Eyes open on load (lids, one short blink, blur to sharp). No text. |
| 0.105 – 0.25 | Maria | Live leaderboard "Riverside · today": she climbs #6 to #3. "Gold level unlocked" card (app tier badge) when she reaches #3. Callouts pinned to Tom and Lena. Ground rings with pace and distance at their feet. |
| 0.25 – 0.405 | Maria | Tom passes her: rank drops, red "TOM PASSED YOU" line, chip on Tom's callout. |
| 0.38 – 0.425 | hop 1 | Camera zooms into Tom's head, eyes close, cut, eyes open in Tom's view. |
| 0.405 – 0.59 | Tom | "Every runner, their own game." Pace and distance readouts. Callout on Lena ahead. |
| 0.57 – 0.61 | hop 2 | Into Lena. |
| 0.59 – 0.77 | Lena | "Brands play too." League of Brands card (Movement Index, one decimal) and live commentary typing in. Callout on Sam ahead. |
| 0.75 – 0.79 | hop 3 | Into Sam. |
| 0.77 – 0.93 | Sam | "His steps earn a coffee." Coffee goal at Bean Bar fills 86% to 100% and unlocks as the café comes closer. |
| 0.93 – 1 | Sam | "Now the whole community plays." Book a demo, Find your community. |

Every HUD card opens with a boot reveal: a line draws from the centre, the card opens around it,
rows fade in, text decodes. Flat white lines, no glow. Reduced motion skips all of it.
Sound is off until the visitor presses "Sound off"; tones are synthesised in the page (Web Audio).

## Files

- `src.html` is the source: title, styles, markup and script, with a `/*AR_DATA*/` placeholder.
- `ar-data.js` holds `window.AR`: runner tracks per frame, in 1280x720 pixels, `[x_centre, y_top, height]`.
  - `AR.B.r0/r1`, `AR.C.r0/r1`: Tom and Lena in Maria's two clips.
  - `AR.N.tom`: Lena in Tom's clip. `AR.N.lena`: Sam in Lena's clip.
  - `AR.A`, `AR.cafe`, `AR.shop` are left over from earlier drafts and unused.
- `build.py` writes `index.html` (doctype, charset, viewport, then `src.html` with the data inlined).
  Edit `src.html` or `ar-data.js`, never `index.html`.
- Frames:
  - `b/f000–f119.jpg` and `c/f000–f149.jpg`: Maria's run, 1280x720, 15 fps (8 s Veo clip, then 10 s gen4_turbo continuation from `b/f119`).
  - `t/`, `l/`, `f/s00–s23.jpg`: Tom's, Lena's and Sam's views, 96 frames each at 12 fps, packed four frames per sheet (2x2 of 960x540). The artifact host allows at most 511 files, which is why these are sheets.
- `tier_gold.png` is the app's Gold tier badge (same file as `sportin.io/proto/media/app/tier_gold.png`).
- `tools/`
  - `runway_t2v.py`, `runway_i2v.py`: Runway API, text-to-video and image-to-video. Key from `RUNWAYML_API_SECRET`; the scripts never print it.
  - `prompts/`: the exact prompts used for every clip.
  - `detect.swift` (Apple Vision person boxes per frame) and `track.py` (boxes to a smoothed track).
  - `shots.cjs`: headless Chrome stills at given scroll positions, desktop 1440x900 and phone 390x844.

## How the clips were made

| Clip | Model | Length | Start |
|---|---|---|---|
| Maria 1 (`b/`) | veo3.1_fast, text to video | 8 s | prompt only |
| Maria 2 (`c/`) | gen4_turbo, image to video | 10 s | `b/f119.jpg` |
| Tom, Lena, Sam (`t/`, `l/`, `f/`) | veo3.1_fast, text to video | 8 s each | prompt only |

The hops hide the cuts: the camera zooms into the next runner's head, the lids close, and the
next clip opens behind them. Tom's clip is used up to frame 72, because Lena leaves the frame after that.

## Open items for the next session

- The locked motto is not on the page. The founder removed the opening text block; where the motto
  goes now is the founder's call.
- Brand guard: the founder overrode two rules for this prototype (AI footage, step counts in the
  leaderboard). These overrides are not yet written into the brand-guard rules.
- All names, brands, scores, rankings and partner rewards are a sample, and the page says so in its
  footer note. Partner claims (Bean Bar, Peak Sports and the others) need real partners before launch.
- Phone: the callout on Lena in Tom's view does not show (she runs off the narrow crop). Ground data
  under Tom often hides because it would land on the copy.
- Page weight is about 38 MB of frames. Fine for a prototype; a production version should stream video
  or load sheets on demand.
- Not tested on a real phone or in Safari. Checked in headless Chrome at 1440x900 and 390x844 only.
- Spending Runway credits, publishing or linking this page from the live site are founder decisions.
