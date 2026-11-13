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

Live preview (private artifact, version 21, older than this branch): https://claude.ai/artifact/T9jT6A5Dvvy8yqWijQrBoc
Code: `proto/pov-home/`. Open `proto/pov-home/index.html` from the site root so the
tile videos under `/proto/media/` and `/assets/site/media/` resolve.

## Handoff (2026-11-13): start here

State: everything below is committed on `feat/claude-1110-pov-homepage`, locally. It is NOT pushed;
PR 24 on GitHub still shows the first version. Pushing is the founder's call.

To look at it: from the repo root run `python3 -m http.server 8765 --bind 127.0.0.1`, then open
`http://127.0.0.1:8765/proto/pov-home/index.html`. That small server drops some image requests when
the page loads many at once (a broken badge now and then); reload fixes it, the page is fine.
To change it: edit `proto/pov-home/src.html` (or `ar-data.js`), run `python3 build.py` in that
folder. It refuses to write `index.html` if an inline script has a syntax error.

The page, top to bottom: the film (four runners, one feature each) > the problem ("Without a
reason, people stop.", 72 dots, the four reasons) > "Choose your community." with three tiles >
closing line and "Book a demo".

Waiting on the founder (product calls, do not guess):
1. Background of the problem section. He rejected a grid floor and flat wave lines as "not
   futuristic"; the ribbon of light now in the page has not been judged by him. Five directions
   were offered, all made of movement data: city of trails (recommended), activity rings, heartbeat
   line, race track, step streaks. He has not picked.
2. Wording. All copy is a proposal: the opening "Movement is the game." (the locked motto is still
   not known), and the problem section, where he wrote only "people not engaged are ..." and the
   rest was filled in. A real drop-off figure would replace the 72 and 9, which are a picture.
3. Where the three tiles and the header links go. They all loop back to `#pick`.
4. The buyer's side is not on the page: what an HR lead or a partner gets (numbers, report), any
   real proof (customer, quote, pilot result), a partners entry, how it starts, privacy. He was told;
   he chose the problem section first.
5. Violet next to the brand blue in the ribbon, and glow in that one section: his to accept or not.

What he has rejected, so do not bring back: the 3D coffee cup, the "BEAN BAR" label, Wolf and shop
crests (not in the app), medals flying to the name row and sitting in it, three text cards for the
problem, wireframe backgrounds. He wants picture over text, and gets annoyed when work is started
that he did not ask for.

Never judged by anyone: the hops and all motion in real time (audits used stills), sound, a real
iPhone, Safari. See "Open items" at the end.

## Story, in scroll order

| Scroll (master progress) | Body | What the HUD shows |
|---|---|---|
| 0 – 0.105 | Maria | Eyes open on load (lids, one short blink, blur to sharp). No text. |
| 0.105 – 0.25 | Maria | Live leaderboard "Riverside · today": she climbs #6 to #3. "Gold level unlocked" card (app tier badge) when she reaches #3. Callouts pinned to Tom and Lena. Ground rings with pace and distance at their feet. |
| 0.25 – 0.405 | Maria | Tom passes her: rank drops, red "TOM PASSED YOU" line, chip on Tom's callout. |
| 0.38 – 0.425 | hop 1 | Camera zooms into Tom's head, eyes close, cut, eyes open in Tom's view. |
| 0.405 – 0.59 | Tom | "His pace moves him up." Running leaderboard "Riverside · 5K" with the app's row (rank, avatar, name with pace, time with gap to leader): he climbs #4 to #3. Above the rows, the six runner levels (3K to 42K) with the app's race badges from `/proto/media/app/`; 5K is selected. Pace and distance readouts follow the same pace. Callout on Lena ahead. |
| 0.57 – 0.61 | hop 2 | Into Lena. |
| 0.59 – 0.77 | Lena | "Brands play too." League of Brands card (Movement Index, one decimal) and live commentary typing in. Callout on Sam ahead. |
| 0.75 – 0.79 | hop 3 | Into Sam. |
| 0.77 – 0.93 | Sam | "Sam earns a coffee." Coffee goal at Bean Bar fills 86% to 100% and unlocks as the café comes closer. |
| 0.93 – 1 | Sam | "Now your community plays." Book a demo, Find your community. |

Every HUD card opens with a boot reveal: a line draws from the centre, the card opens around it,
rows fade in, text decodes. Flat white lines, no glow. Reduced motion skips all of it.
Sound is off until the visitor presses "Sound off"; tones are synthesised in the page (Web Audio).

Each body also gets one message from someone else (`MS` in the script), laid out like the app's
channel row: avatar, name, channel, text, one reaction. All sample content.

## The hop (rebuilt after the four-lens audit)

Scan and lock still play on their own when the visitor nears a hop (scan on the first hop only,
300 ms; lock 220 ms with overshoot; 120 ms hold). When the scroll reaches the hop, the page takes
over the scroll and plays one timed move, about 1.4 s: line of light 200 ms, wind up 120 ms, pull
450 ms (slow then very fast, with a noise whoosh), black with a low thump, eyes open 500 ms with a
soft landing zoom. Wheel and touch are ignored while it plays. Scrolling back up through a hop
plays a 0.7 s return. Reduced motion: no takeover, no zoom, only the lids dip. State is `HP`
(which hop, direction, start time) and `HS` (per hop: scan start, sounds played, lock ready).

Other audit fixes in the same pass: coffee counter moved bottom right on desktop; name tags hide while the level-up
card shows and, on phone, while a message shows; Sam's tag in Lena's view opens to the right; text
floor raised to 10-11 px; scroll cue chip; a "Maria / Tom / Lena / Sam" marker replaces the tick
rail; header button hidden at the final beat; one hidden sentence per beat for screen readers;
per-clip colour filter (`GR`) to bring Maria's and Sam's clips closer to Tom's and Lena's.

## Second audit and code review (2026-11-11)

A live UI/UX audit (1440 wide and 375 wide) and an independent code review were run on the page.
Fixed from them:

- Opening: an h1 ("Your community, in play.") with an eyebrow and one line, and the cue chip reads
  LOADING until the first frames are in. The wording is a placeholder, not the locked motto.
- Sam's view: a Rewards card (three partner rewards, the first follows his goal).
- Tom's view: the badges are labelled "Runner levels · 2 of 6", earned ones bright, the rest dim.
- Lena's view: "Movement Index" under the scores, shorter commentary lines.
- Ending: four chips taken from the story (+3 places, #3 on 5K, Round lead, 1 coffee); Sam's clip
  stops at frame 84 so a lamp post does not fill the frame.
- Phone: cards share the width with a gap, tags flip inward near the screen edge, no ground rings
  under the copy, the name row sits above the browser bar.
- Text floor 12 px on desktop. The pace lettering on the ground was removed (rings stay).
- Hop takeover hardening: leaving the story mid-hop releases the scroll (`tick`); 400 ms cooldown
  after a hop (`HP.cd`) so a held scrollbar cannot ping-pong; arriving fast, the picture first
  catches up so scan and lock still play; trophies land directly when the name row is off screen.
- `build.py` syntax-checks every inline script with node and does not write a broken page.
- Dead and duplicate CSS and JS from earlier edits removed.

Left open on purpose: the main card sits right for Maria and left for Tom (it follows where the
runner ahead is); tiles and header links all point to `#pick` (targets are a founder decision);
the takeover against touch momentum is still unproven on a real iPhone.

The 3D coffee cup and the "BEAN BAR" label over the cafe were removed on 2026-11-11 at the
founder's request. Sam's reward now shows in the Rewards card and the big counter only.

## Design team audit loop and copy pass (2026-11-11)

Run as a loop: a design team audit (art direction, game design, motion, product), then fixes, then a
re-audit, until no serious finding was left. A copywriter (Apple page style) rewrote the text once.

Copy now on the page (all proposals, the locked motto is still not known):
opening "Movement is the game." / "Run with four players."; "She climbs as she runs."; "Tom passes
her." / "Now she has someone to catch."; "His pace moves him up." / "#4 to #3 on the 5K board, live.";
"Brands play too." / "Lena's steps just put Peak Sports first."; "Sam earns a coffee." / "Bean Bar
gets a customer."; ending "Your turn" / "Now your community plays." / "Members move. Partners reward.
You see the numbers."; closing "Try it for 8 weeks. ...". Commentary lines lost their en dashes
("5.3 to 4.9", "4.9 each"). The first ending chip is "Gold level" (Maria ends #4, so "+3 places" was wrong).

Design changes:
- Medals no longer stack on other rewards: Dragon at 0.15 (before Gold), Phoenix at 0.845 (before the
  coffee). Round crop (the PNGs have a black square behind them), dark plate behind the day count,
  Dragon brightened, a small pop when a medal lands, Dolphin placed beside Sam on desktop (`x` in `TRO`).
- The name row with the four medals stays through the ending.
- Lena: Peak Sports starts behind (4.8 to 4.9) and flips to 5.3 at 0.611, just before the hop lands,
  so board, tag and copy agree. In Tom's view Lena's tag shows her 5K time, not steps.
- Tiles use the HUD chamfer and a square arrow (paint only, same sizes).
- Phone: medal sits left of the chat card; chat sits below the boards; League and commentary headers
  on one line without the LIVE badge; no commentary timestamps; ending chips on one row.
- Phones up to 830 px tall (most phones once the browser bars show) get a tighter layout: headline
  only in the five middle beats, medal without labels, no name tags, no chat reaction. Cards hang
  from the top and copy from the bottom, so the full layout only fits taller screens.

## After the film (founder's order, 2026-11-11)

The film shows how the game works. Then, in this order:

1. The problem (`.why`, 260vh with a sticky screen, driven by `why()`): 72 dots stand for people and a
   counter reads "Still moving 72/72". Scrolling, 63 go dark ("Without a reason, people stop.", 09/72).
   Then the headline turns to "With four, they don't.", the four reasons from the film light one by one
   (a rank to climb · Maria, a rival to catch · Tom, a team to win for · Lena, a reward to earn · Sam)
   and each brings a quarter of the dots back in blue, to 72/72. The 72 and the 9 are a picture, not a
   statistic. An earlier version with three text cards was rejected by the founder.
   Behind it (`#whyC` sharp, `#whyG` blurred by CSS, both drawn by `whyBg()`): a ribbon of light made
   of about 68 fine lines that twist around each other and add up where they cross, over a soft glow,
   with sparks riding along. It follows the counter: silver and rolling at 72/72, one thin grey line
   at 09/72, then blue to violet as people come back. Reduced motion: it stands still. This one
   section uses glow on purpose; the founder rejected a flat grid floor and flat wave lines as not
   futuristic. The HUD in the film stays flat.
2. "Choose your community." with the three tiles as the last actions.
3. The closing line and a "Book a demo" button.

## Target medals (sample)

One medal from the app's Rewards > Target tab unlocks in each body (`MED` in the script): Maria a
Dragon ("5 of 5 days"), Tom an Eagle ("10 of 10 days", when he reaches #3), Lena a Dolphin ("10 of
10 days"), Sam a Phoenix ("30 of 30 days"; the founder gave the 30, it is not in the client code).
Each shows as a card in the same style as "Gold level unlocked" (`#hMed`, classes `lvl med`): badge,
"Target medal", "Dragon unlocked", day count. On phone it is a small badge and name. The founder
rejected an earlier version on 2026-11-11 where the medal flew down to the "Maria / Tom / Lena / Sam"
marker and replaced the dot; that marker is back to plain dots and hides again at the ending.
Images `target_*.png` are resized from `TargetMedal*.imageset` on the
app's `testing-ios` branch. The catalogue there (`TargetHistoryCatalog.swift`): daily Sloth, Turtle,
Elephant, Silver to Master Puma; multi-day Dolphin, Eagle, Dragon, Bear, Phoenix.

Do not take medals from the app repo's `main` branch: it is stale. The Wolf, Dragon and Phoenix
crests there belong to the Shop preview behind a flag, not to what members see. An earlier version
of this page used them by mistake.

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

Silent takes cost less: pass `noaudio` as the last argument to `runway_t2v.py`.

The hops hide the cuts: the camera zooms into the next runner's head, the lids close, and the
next clip opens behind them. Tom's clip is used up to frame 72, because Lena leaves the frame after that.

## Open items for the next session

- The locked motto is not on the page. The founder removed the opening text block; where the motto
  goes now is the founder's call.
- Brand guard: the founder overrode two rules for this prototype (AI footage, step counts in the
  leaderboard). These overrides are not yet written into the brand-guard rules.
- All names, brands, scores, rankings and partner rewards are a sample, and the page says so in its
  footer note. Partner claims (Bean Bar, Peak Sports and the others) need real partners before launch.
- Phone: in Tom's view the narrow crop now slides right so Lena and her callout stay in frame. The
  header fits at 375 wide (smaller wordmark and button padding under 420). Still open: the pace and
  distance lettering on the ground is desktop only, and on desktop it often hides under Tom because
  it would land on the copy.
- Page weight is about 38 MB of frames. Fine for a prototype; a production version should stream video
  or load sheets on demand.
- Maria's second clip (`c/`) is used only up to frame 72 (`CN` in the script). After that the model
  invents a pedestrian who turns unnaturally in the street. A regenerated take (gen4_turbo, prompt
  `prompt-maria-2b.txt`) was worse and was not used. Frames `c/f073` onward are now unused.
- Tom's view (`t/`) is a new take made on 2026-11-10 with `prompt-tom-2.txt`: Lena alone, in frame
  for the whole clip. `AR.N.tom` was re-tracked from it. From about frame 50 a dark shape (it reads
  as the runner's own arm) swings in at the far left edge; on desktop it sits under the leaderboard
  card and the left shade, on phone it is outside the crop. Not checked on a wide desktop window.
- Sam's view (`f/`) is a new take made on 2026-11-10 with `prompt-sam-3.txt`: an empty path in true
  first person, cafe on the left. The prompt names no person at all, only a moving camera. Every
  prompt that said "a man running" made the model draw that man in front of the camera
  (`prompt-fourth.txt`, `prompt-sam-2.txt`). The runner's own arm swings in at the far left edge in some
  frames: desktop zooms in 4% and leans right, phone crops left to the cafe.
- Sheet URLs carry `?v=2` so browsers do not reuse cached sheets of the old Tom and Sam clips. Bump
  it when a clip is replaced again.
- From the audit, left for the founder: an opening line or the motto over the first frames (the
  founder removed the opening text earlier), and whether "Tom passes her" should move to where Tom
  first enters the frame.
- The hop takes over the scroll. This is untested with touch momentum on a real phone.
- Not tested on a real phone or in Safari. Checked in headless Chrome at 1440x900 and 390x844 only.
- Spending Runway credits, publishing or linking this page from the live site are founder decisions.
