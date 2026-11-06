# SportIn for gyms — DESIGN.md

Who it's for: gym owners and operators (independent gyms, studios, chains).
What it says: a gym sees a member for about an hour a day and loses them in the rest of
it. SportIn turns the hours outside the gym into leagues, challenges and rewards in the
gym's own colours, so members keep coming back.

Feeling: calm, confident, product-first. Large type, lots of air, one idea per screen.
The product (phone screens, the day timeline, the owner dashboard) is the imagery.

Direction note: chosen from the existing SportIn brand and the brief ("Apple style",
scroll-driven). No outside design-system references were used.

## Color

Light page with black "stage" sections for the scroll stories. No theme toggle: the
contrast between paper and stage is part of the pacing.

| Token | Value | Role |
|---|---|---|
| `--paper` | `#FFFFFF` | Page background |
| `--mist` | `#F2F3F5` | Alternate light section, device bezels on paper |
| `--ink` | `#0A1020` | Text on light; primary text |
| `--slate` | `#596275` | Secondary text on light (6.0:1 on paper) |
| `--line` | `#E2E5EB` | Hairlines and borders on light |
| `--stage` | `#000000` | Stage sections (the day timeline, games) |
| `--stage-2` | `#16181D` | Raised surfaces on stage |
| `--stage-text` | `#F5F6F8` | Text on stage |
| `--stage-muted` | `#9AA1AE` | Secondary text on stage (7.4:1 on black) |
| `--blue` | `#0751FB` | Brand. Primary buttons, links, "the gym hour", the member's own row |
| `--blue-bright` | `#4D82FF` | Brand on stage, where `--blue` is too dark (5.6:1 on black) |
| `--ember` | `#FF6B3D` | Accent. Only for activity outside the gym (steps, runs, streaks) |
| `--success` | `#1F9D55` | Positive deltas |
| `--warning` | `#C98A00` | "At risk" member state |

Rules: blue means the gym; ember means life outside it. That pairing carries the story,
so neither colour is used as decoration. No gradients on text, no glows.

## Typography

- **Display: Archivo**, width 112–125, weight 800. Headlines only.
- **Text: Instrument Sans** 400/500/600. Everything else, including numbers
  (`font-variant-numeric: tabular-nums` in tables and counters).

| Token | Size | Line height | Use |
|---|---|---|---|
| `--fs-hero` | clamp(44px, 8vw, 120px) | 0.98 | Hero headline |
| `--fs-1` | clamp(36px, 5.6vw, 80px) | 1.02 | Section headline |
| `--fs-2` | clamp(28px, 3.4vw, 48px) | 1.08 | Sub-headline, step title |
| `--fs-3` | clamp(20px, 1.7vw, 24px) | 1.25 | Card titles |
| `--fs-lede` | clamp(19px, 1.6vw, 23px) | 1.45 | Intro paragraph |
| `--fs-body` | 17px | 1.55 | Body |
| `--fs-small` | 14px | 1.45 | Captions, UI labels |

Headlines are sentence case, no colour-accented words. No all-caps labels, no
monospace labels. Body lines max ~65 characters.

## Spacing and layout

- 8-point scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160.
- Section padding: clamp(96px, 14vw, 180px) top and bottom.
- Content width 1180px; text column max 640px. Gutter clamp(20px, 5vw, 56px).
- Hero centred; everything else left-aligned to the content column.

## Shape and depth

- Radius: 10px (buttons are pills, 999px), 20px (panels), 44px (phone body).
- One shadow, only on floating devices: `0 30px 60px -20px rgba(10,16,32,.35)`.

## Components

- **Buttons**: primary (blue fill, white text), secondary (ink outline on light /
  white outline on stage), quiet (text link). 48px tall, 44px minimum hit area.
  Hover darkens 8%; `:active` scales to 0.97; focus ring 3px `--blue` offset 3px.
  Labels say what happens: "Book a demo", "Email us". No arrows.
- **Nav**: logo, three anchors, one primary button. Sticky; turns translucent over
  content after 40px of scroll. Collapses to logo + button on phones.
- **Phone**: HTML/CSS device frame holding real-looking app UI (no screenshots).
- **Footer**: three short link lists, legal links, company line.

## Motion

One system, built with GSAP ScrollTrigger:

- **Scroll stories** (pinned, scrubbed to scroll position): the day timeline, the
  product phone, the games track. Scrub uses `scrub: 0.6` so it eases behind the finger.
- **Load**: one sequence in the hero only: headline and phone rise 24px and fade in,
  700ms, ease-out-quint `cubic-bezier(0.23, 1, 0.32, 1)`.
- **UI**: hover/press 150ms `ease`. No fade-up on every section.
- Only `transform` and `opacity` animate.
- `prefers-reduced-motion: reduce`: nothing pins or scrubs; every story shows its final
  state as a static layout.
- Phones under 760px: the games track becomes a native swipe row (scroll-snap) instead
  of a pinned horizontal scroll.

## Imagery and icons

- No stock photos. The product UI is the imagery; all names in it are fictional
  ("Northside Gym") and all figures are labelled as sample figures.
- Icons: simple 1.75px-stroke inline SVGs drawn for this site, used sparingly.
