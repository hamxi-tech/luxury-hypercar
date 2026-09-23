# Elström Aubade

A flagship digital experience for a fictional hypercar house, built to show what
a luxury brand's launch page can be on the web: a real-time car, a camera that is
directed by scroll rather than orbited, an environment that moves from night to
day, an intelligence x-ray, a walk into the cockpit, and a configurator inside the
story.

Elström and the Aubade are invented for this demonstration. Every figure on the
page is fictional.

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Requires Node 22. No environment variables, no services.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, three.js 0.186,
React Three Fiber 9, drei 10, GSAP ScrollTrigger, Lenis.

## Layout

```
src/app/                 layout (fonts, metadata), page, global styles
src/components/
  Chapter.tsx            a scroll track with a sticky stage; writes progress to the store
  Nav.tsx, Wordmark.tsx, SmoothScroll.tsx
  sections/              the chapters' copy and captions, configurator panel, case study, footer
  scene/
    SceneMount.tsx       client leaf: poster for bots / no WebGL, loading curtain, intro
    Scene.tsx            the single canvas, director, floor, pointer
    director.ts          shot lists per chapter and the scene targets derived from progress
    live.ts              eased per-frame state, outside React
    LightRig.tsx         procedural night / dawn / day environment, re-baked on change
    Vehicle.tsx          model load, material replacement, explode, x-ray, door, config
    Intelligence.tsx     the nervous-system map
    Speed.tsx            streaming lights for the performance chapter
src/lib/
  store.ts               chapter / progress / intro store, configurator options
  device.ts              device tier, reduced motion, WebGL and bot detection
public/models/aubade.glb the prepared vehicle (see docs/ASSETS.md)
public/draco/            Draco decoder
docs/                    ASSETS.md (licences), DECISIONS.md (why)
```

## How the page works

The page is a stack of chapters. Each chapter is a tall section whose inner stage
is `position: sticky` for the viewport height. A ScrollTrigger on the section
reports 0..1 progress into a small store; the director turns chapter + progress
into camera position, look-at, field of view, daylight, headlamps, explode, x-ray
stage, speed, door and cabin light. The render loop eases every value toward its
target and draws a frame only while something is still moving.

Captions declare their window with `data-at="start,end"` (fractions of the
chapter) and fade in and out inside it, so the words and the shot arrive together.

## Performance

- Two model builds, Draco + WebP: `aubade.glb` (148k triangles, 1.3 MB) for
  desktop, `aubade-lite.glb` (117k, 1.0 MB) for touch devices. Painted panels are
  never simplified; wipers, rims and interior parts are. Preloaded from the HTML
  head with a media query. Decoder served from `/draco/`.
- Tiers (`src/lib/device.ts`) are chosen from the GPU renderer string: discrete
  GPUs get refraction, reflective floor and contact shadow (pixel ratio 1.5);
  integrated GPUs get shadows only (1.25) with adaptive resolution during motion;
  phones get the lighter model, no shadows, no pointer lighting.
- Environment lighting is baked into fourteen keyframes at load and blended in the
  shader (`envBlend.ts`); nothing re-bakes during scroll.
- Every shader variant (x-ray transparency, refraction off, flake off) is compiled
  with `compileAsync` behind the loading screen and during the reveal, so no
  program compiles mid-scroll.
- On-demand render loop. Idle is zero draw calls (measured by wrapping the WebGL
  context; the dev build exposes `window.__aubade` and `window.__aubadeFlags`,
  which switch individual passes off for A/B profiling).
- Crawlers, Lighthouse and devices without WebGL receive `public/poster.webp`
  and never download three.js.
- `prefers-reduced-motion`: smooth scroll off, intro jumps to its end, captions
  appear without movement.

## QA notes

Test in a foreground browser window. A background tab throttles
`requestAnimationFrame` to one frame a second and every eased value looks stuck.
