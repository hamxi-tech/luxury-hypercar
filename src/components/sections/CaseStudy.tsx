"use client";

import { useSyncExternalStore } from "react";
import { budget } from "@/lib/device";

/*
  The case study is the part of the page for the person deciding whether to
  commission one of these. It says what was built and how, in plain terms, and
  it reports the visitor's own device tier, which is a fact about this visit
  rather than a claim.
*/

const BLOCKS = [
  {
    title: "One scene, seven chapters",
    body: "A single WebGL canvas sits under the whole page. Each chapter is a scroll track that hands its progress to a camera director, which plays a short shot list: close-ups, a side profile, the walk into the cockpit, the final reveal. Nothing is re-created between sections, so there is no reload and no flash.",
  },
  {
    title: "A licensed model, our materials",
    body: "The car is a licensed concept-car model rather than something modelled from scratch, which is how a project like this stays on budget. Every material on it is replaced: the paint has its own clear coat and metallic flake, the glass refracts, the lamps really light the floor, and the panels are re-parented so the car can come apart.",
  },
  {
    title: "Light that moves with the story",
    body: "There is no HDRI. The environment is a small studio of emissive panels and a sky gradient, baked into fourteen reflection maps at load and blended in the shader as the visitor scrolls, so nothing is re-baked mid-story. The page is one long morning.",
  },
  {
    title: "Fast where it counts",
    body: "The model ships in two builds, 1 MB for desktop and 0.7 MB for phones, Draco-compressed with WebP textures. The device is tiered once at load from its GPU: pixel ratio is clamped, refraction, shadows and the reflective floor are switched by tier, every shader variant is compiled behind the loading screen, and the render loop draws a frame only while something is changing.",
  },
];

export function CaseStudy() {
  const tier = useSyncExternalStore(
    () => () => {},
    () => {
      const b = budget();
      return `${b.tier} tier, pixel ratio capped at ${b.dpr[1]}, reflective floor ${b.floorReflection ? "on" : "off"}`;
    },
    () => null,
  );

  return (
    <section id="case-study" className="relative px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="display max-w-[22ch] text-[clamp(2.2rem,4.6vw,4rem)] text-ivory">
          How this experience was built.
        </h2>
        <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ivory-dim md:text-lg">
          Elström is a fictional house and the Aubade does not exist. The page exists
          to show what a luxury brand&apos;s launch experience can be on the web: a real-time
          car, a camera that is directed rather than orbited, and a configurator inside
          the story instead of on a separate page.
        </p>

        <div className="mt-16 grid gap-px bg-line md:mt-24 md:grid-cols-2">
          {BLOCKS.map((b) => (
            <article key={b.title} className="bg-graphite p-8 md:p-12">
              <h3 className="text-xl text-ivory md:text-2xl">{b.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-ivory-dim">{b.body}</p>
            </article>
          ))}
        </div>

        <dl className="mt-16 grid gap-6 text-[14px] md:mt-24 md:grid-cols-3">
          <div>
            <dt className="text-ivory-faint">Stack</dt>
            <dd className="mt-1 text-ivory">Next.js, React Three Fiber, three.js, GSAP ScrollTrigger, Lenis</dd>
          </div>
          <div>
            <dt className="text-ivory-faint">This visit</dt>
            <dd className="mt-1 text-ivory">{tier ?? "Measuring the device"}</dd>
          </div>
          <div>
            <dt className="text-ivory-faint">Model</dt>
            <dd className="mt-1 text-ivory">
              CarConcept by Eric Chadwick and Darmstadt Graphics Group, CC BY 4.0, via the Khronos
              glTF sample assets. Materials, lighting and environment are original.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
