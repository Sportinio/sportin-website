# Vendored libraries

Served from the site itself, so the pages do not depend on a CDN being up.

| File | Library | Version | Licence |
| --- | --- | --- | --- |
| gsap.min.js | GSAP | 3.15.0 | GSAP Standard License (free, including commercial use) |
| ScrollTrigger.min.js | GSAP ScrollTrigger plugin | 3.15.0 | GSAP Standard License |
| lenis.min.js | Lenis smooth scroll | 1.3.27 | MIT |

Loaded by index.html before /proto/motion.js, which registers ScrollTrigger and exposes
`window.motion = { gsap, ScrollTrigger, lenis, reduced }`. Lenis is off unless `<html data-smooth="on">`.

To update: download the same files from `https://cdn.jsdelivr.net/npm/gsap@<version>/dist/` and
`https://cdn.jsdelivr.net/npm/lenis@<version>/dist/`, and change the versions here.
