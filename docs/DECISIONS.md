# Decisions

Why the Elström Aubade experience looks and behaves the way it does. Written so
the reasoning survives, and so it can be talked through rather than just shown.

## Brand

**A Nordic house, not an Italian one.** Every hypercar reference (Ferrari,
Lamborghini, Pagani, Bugatti) trades on Italian or French heritage. A Swedish
surname (Elström, "electric current" hidden in plain sight) gives the fiction a
different temperature: cold, engineered, calm. The page is dark not because dark
is the default for cars, but because the story is a night turning into morning.

**The model is called Aubade.** An aubade is a dawn song, the opposite of a
nocturne. The whole page is one: it opens in a black hall and ends in daylight.
The name, the environment transition and the case-study narrative are the same
idea.

**The mark is the umlaut.** The two dots over the ö are the only logo. They are
the two points of light the headlamps make, which is why the reveal starts with
the lamps and why the loading state is two breathing dots.

## Design

**One theme, locked dark.** The interface never inverts. Only the light in the
scene changes, from night through dawn to day, so the visitor feels time passing
without the page ever "switching modes".

**Monochrome interface, one accent, the paint is the colour.** Ivory on graphite,
with a single desaturated ice blue for focus, selection and the intelligence map.
No gradients, no glows, no glass cards. Research across current manufacturer sites
showed the expensive ones let the car supply the hue (Pagani has no brand colour on
the page at all).

**Extended grotesque display, sentence case, no shouting.** Anybody at width 130
and weight 300 for headlines; Familjen Grotesk for reading; Geist Mono only for
data. Headlines are sentences with full stops ("Every surface has purpose.") in
the manner of Porsche, not slogans in caps. No eyebrows, no section numbers.

**Numbers as typography, one at a time.** The performance figures appear one per
shot, huge, with a small unit and a smaller label, tied to the camera moment. Never
a "three big numbers" strip under the hero, which every manufacturer does.

**The configurator lives inside the story.** Manufacturers send you to a separate
tool. Here paint, wheels and interior change the same car in the same scene, which
is the feature a client pays extra for and the page proves it in place.

**No scroll cue, no autoplay video.** The reveal plays itself in the first seconds
whether or not the visitor scrolls, and the visitor can lean the camera with the
mouse from the first frame. A film would be passive.

## Engineering

**A licensed model with every material replaced.** The Khronos CarConcept glTF
(CC BY 4.0) supplied geometry and baked occlusion; paint, clear coat, flake, glass,
lamps, interior and the way the car comes apart are ours. Modelling a car from
scratch was rejected as the wrong place to spend the budget; the experience is the
product. Attribution stays in the case study and footer (see `ASSETS.md`).

**One canvas, a directed camera.** A single fixed canvas under the page. Chapters
are tall scroll tracks with a sticky stage; each writes its progress to a store,
and a director maps that to a short shot list per chapter, eased between shots and
damped in the loop so chapter changes never snap. An orbit control would have made
it a viewer, not a film.

**Procedural light, not an HDRI.** The environment is a small studio of emissive
panels and a sky-gradient sphere, blended between three states and re-baked to a
PMREM map only when it changes by more than a threshold. This is what lets the
page move from night to day; a single HDRI cannot. It also costs nothing to
download.

**On-demand rendering, verified.** The loop draws only while a value is still
converging or the visitor is acting. Verified by wrapping the WebGL context: two
seconds idle equals zero draw calls. The frame delta is measured in the director
rather than taken from the loop, because in demand mode the loop's clock stops
between frames.

**Device tiering, once.** Pixel ratio clamp, refraction (a full extra pass),
shadow map size, the reflective floor (another pass) and pointer lighting are
decided at load from pointer type, cores and memory. Crawlers and devices without
WebGL get a poster.

**Continuous values never touch React.** Scroll progress, pointer and every eased
scene value live in plain objects read inside the frame loop. The configurator's
three discrete choices go through `useSyncExternalStore` because they change a
handful of times per visit.

**Portrait is a different shot, not a cropped one.** The shot list is composed for
landscape. On a phone the director stands further back for exterior shots (up to
1.85x the distance) and opens the lens for the cockpit, where there is no room to
step back, so the composition survives instead of being cut off at the fenders.

## Performance pass (2026-09-24)

Measured on an Intel UHD 630 laptop GPU at 1440x900, production build, scripted
scroll through the whole page. Before: 19.7 fps average, 95th percentile frame
200 ms, worst 734 ms, first frame at 3.0 s. The median frame was already 16.7 ms;
the problem was stalls, not steady load. Each suspect was switched off in turn
with a dev-only flag set and profiled separately.

**What was actually slow, in order.**
1. Refraction. The glass's transmission pass re-renders the scene into a
   full-size buffer with mipmaps every frame. Turning it off alone took the 95th
   percentile from 200 ms to 67 ms. It is now reserved for discrete GPUs.
2. Shader compiles mid-scroll. three.js keys its program cache on transparency,
   so the x-ray's fade compiled twenty new shaders while the visitor scrolled
   (programs went from 50 to 65 during one scroll). Every variant is now compiled
   with compileAsync: the base state behind the loading screen, the rest during
   the reveal, in parallel, without blocking a frame.
3. Environment re-bakes. The light rig re-baked its PMREM map on almost every
   frame of a daylight transition. Fourteen keyframes are baked once at load and
   blended in the shader by a small patch to the physical material (envBlend.ts),
   so the scroll never bakes.
4. Geometry. The model drew 213k triangles per pass, three passes per frame. The
   wipers alone were 24k. Small parts are simplified with meshoptimizer; painted
   and glazed panels are untouched, because clear-coat reflections expose every
   facet (a first attempt at 75 percent on the body faceted the fenders).
   Desktop build 148k triangles, phone build 117k.
5. Extra passes. Contact shadow and reflective floor are now high-tier only.

**Tiering reads the GPU.** Pointer type and core count could not tell an Intel
UHD from an RTX. The renderer string can, so the tier is chosen from it: discrete
GPUs get refraction, reflection and contact shadows; integrated GPUs get shadows
only; phones get the lighter model and no shadows. Apple silicon desktops count as
capable.

**Resolution scales during motion.** On integrated tiers, frames over 24 ms while
the camera moves lower the render scale a step at a time (floor 0.75), and the
full resolution returns a quarter second after the scene settles. Every still
frame is full quality.

**Scroll coupling.** Lenis smoothing shortened from 1.1 s to 0.85 s and the
camera follow raised from lambda 4 to 6, so the picture answers the wheel sooner.

**Loading.** The model is preloaded from the HTML head (with a media query so
phones fetch the lighter build), so it downloads alongside the JavaScript rather
than after it.

## Things that changed during the build

- **Background-throttled tabs.** The first idle measurement showed the loop never
  sleeping. The cause was the test browser being in the background: rAF at one
  frame a second made the damping converge sixty times too slowly. The delta cap
  was raised so a throttled tab still settles, and QA now waits for `moving` to be
  false before judging a frame.
- **ScrollTrigger toggle order.** On a jump (anchor link, mid-page reload) the
  `onEnter` callback fires after `onUpdate`, so a chapter reported progress 0 and
  showed its first shot. The toggles now pass the real progress.
- **StrictMode and re-parenting.** React runs memo callbacks twice in development.
  The second pass re-parented the moving panels into new groups while the loop drove
  the first, so the explode did nothing. The reorganisation is now cached on the
  model.
- **Wheels on the floor.** The explode code wrote the wheel groups' height as an
  absolute value instead of an offset, dropping every wheel 38 cm. Offsets are now
  applied to a cached rest position.
- **Refraction ignores opacity.** The x-ray fade had no effect on the glass until
  its transmission was faded alongside its opacity.
- **Colour space.** Palette values in the light rig are linear. The first night
  backdrop was set as if sRGB and came out mid grey.
