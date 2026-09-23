import { Chapter } from "@/components/Chapter";
import { Wordmark } from "@/components/Wordmark";
import { StudioPanel } from "@/components/sections/StudioPanel";
import { StudioDrag } from "@/components/sections/StudioDrag";

/*
  The story chapters. Each one is a tall scroll track with a sticky stage; the
  captions declare the window of the chapter they belong to, in fractions, so
  a caption and the shot it describes always arrive together.
*/

const captionBase = "absolute max-w-[34rem] px-5 md:px-10";

export function Reveal() {
  return (
    <Chapter name="reveal" length={2.6} id="top">
      <div className="absolute left-5 top-6 md:left-10 md:top-7" data-at="0,1.5">
        <Wordmark className="text-[15px]" />
      </div>
      <div className={`${captionBase} bottom-[12dvh] left-0`} data-at="0.58,1.5">
        <h1 className="display text-[clamp(3.6rem,10vw,9.5rem)] text-ivory">Aubade</h1>
        <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-ivory-dim md:text-xl">
          Performance that thinks. A hypercar that reads the road before it arrives.
        </p>
      </div>
    </Chapter>
  );
}

export function Exterior() {
  return (
    <Chapter name="exterior" length={4.4} id="design">
      <div className={`${captionBase} left-0 top-[16dvh]`} data-at="0.02,0.2">
        <h2 className="display text-[clamp(2.4rem,5.4vw,4.8rem)] text-ivory">
          Every surface has purpose.
        </h2>
      </div>

      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.22,0.42">
        <p className="text-xl leading-snug text-ivory md:text-2xl">One continuous skin.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          Air is guided over the body rather than pushed aside. There is no seam on
          the car for a line of air to trip over.
        </p>
      </div>

      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.5,0.76">
        <p className="text-xl leading-snug text-ivory md:text-2xl">Nothing is bolted on.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          Hood, roof, glass, doors and the rear clamshell are the only pieces that
          lift away. Everything else is one structure.
        </p>
      </div>

      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.86,1.5">
        <p className="text-xl leading-snug text-ivory md:text-2xl">Two points of light.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          The lamps are the two marks over the name. They are the first thing the
          car shows you and the last thing it shows anyone behind it.
        </p>
      </div>
    </Chapter>
  );
}

const FIGURES: { value: string; unit: string; label: string; at: string }[] = [
  { value: "1 410", unit: "kW", label: "Peak output across four motors", at: "0.26,0.5" },
  { value: "2.1", unit: "s", label: "0 to 100 km/h", at: "0.52,0.74" },
  { value: "412", unit: "km/h", label: "Top speed with the wing closed", at: "0.76,1.5" },
];

export function Performance() {
  return (
    <Chapter name="performance" length={3.6} id="performance">
      <div className={`${captionBase} left-0 top-[16dvh]`} data-at="0.02,0.24">
        <h2 className="display text-[clamp(2.4rem,5.4vw,4.8rem)] text-ivory">Built for the dawn run.</h2>
        <p className="mt-4 text-base leading-relaxed text-ivory-dim md:text-lg">
          Four motors, one on each wheel, and a body that closes itself up at speed.
        </p>
      </div>
      {FIGURES.map((f) => (
        <div key={f.label} className={`${captionBase} bottom-[12dvh] left-0`} data-at={f.at}>
          <p className="display text-[clamp(4.5rem,13vw,11rem)] leading-none text-ivory">
            {f.value}
            <span className="mono ml-3 align-top text-[0.22em] text-ivory-dim">{f.unit}</span>
          </p>
          <p className="mono mt-2 text-[13px] uppercase tracking-[0.14em] text-ivory-faint">{f.label}</p>
        </div>
      ))}
    </Chapter>
  );
}

const STAGES = [
  {
    at: "0.16,0.36",
    title: "Sense.",
    body: "Nine sensors build one picture of the road, hundreds of times a second: what is ahead, what is beside, and what every wheel is doing.",
  },
  {
    at: "0.38,0.56",
    title: "Understand.",
    body: "The core turns that picture into a model of the car, the surface, and what the next hundred metres will ask of both.",
  },
  {
    at: "0.58,0.74",
    title: "Decide.",
    body: "Each motor, brake and aero surface receives its own instruction. None of them has to wait for the others.",
  },
  {
    at: "0.76,0.94",
    title: "Act.",
    body: "The battery sits between the motors, so the shortest path in the car is the one power takes.",
  },
];

export function Intelligence() {
  return (
    <Chapter name="intelligence" length={3.8} id="intelligence">
      <div className={`${captionBase} left-0 top-[16dvh]`} data-at="0.0,0.15">
        <h2 className="display text-[clamp(2.4rem,5.4vw,4.8rem)] text-ivory">
          The intelligence behind the machine.
        </h2>
      </div>
      {STAGES.map((s) => (
        <div key={s.title} className={`${captionBase} right-0 top-[16dvh] md:max-w-[26rem]`} data-at={s.at}>
          <p className="display text-3xl text-ivory md:text-4xl">{s.title}</p>
          <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">{s.body}</p>
        </div>
      ))}
    </Chapter>
  );
}

export function Interior() {
  return (
    <Chapter name="interior" length={3.4} id="interior">
      <div className={`${captionBase} left-0 top-[16dvh]`} data-at="0.0,0.22">
        <h2 className="display text-[clamp(2.4rem,5.4vw,4.8rem)] text-ivory">Step in.</h2>
      </div>
      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.3,0.52">
        <p className="text-xl leading-snug text-ivory md:text-2xl">The driver sits in the centre.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          One seat forward and two behind, so the view down the road is symmetrical
          and the car turns around you.
        </p>
      </div>
      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.56,0.78">
        <p className="text-xl leading-snug text-ivory md:text-2xl">Made to be touched.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          Leather on every surface a hand reaches. The colour and the stitch are
          yours to choose in the studio.
        </p>
      </div>
      <div className={`${captionBase} bottom-[14dvh] left-0`} data-at="0.8,1.5">
        <p className="text-xl leading-snug text-ivory md:text-2xl">Light from ahead.</p>
        <p className="mt-3 text-base leading-relaxed text-ivory-dim md:text-lg">
          The glass runs from the front of the hood to the roofline, and the cabin
          brightens with the day.
        </p>
      </div>
    </Chapter>
  );
}

export function Studio() {
  return (
    <Chapter name="studio" length={1.6} id="studio">
      <StudioDrag />
      <div className="scrim-left pointer-events-none absolute inset-y-0 left-0 w-[60%]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-[12dvh] px-5 md:px-10">
        <h2 className="display text-[clamp(2.4rem,5.4vw,4.8rem)] text-ivory">Make it yours.</h2>
        <p className="mt-3 text-base text-ivory-dim md:text-lg">Drag the car to turn it.</p>
      </div>
      <StudioPanel />
    </Chapter>
  );
}

export function Showroom() {
  return (
    <Chapter name="showroom" length={2} id="showroom">
      <div className="scrim-bottom absolute inset-x-0 bottom-0 h-[55dvh]" aria-hidden="true" />
      <div className="scrim-left absolute inset-y-0 left-0 w-[55%]" aria-hidden="true" />
      <div className={`${captionBase} bottom-[12dvh] left-0`} data-at="0.05,1.5">
        <h2 className="display text-[clamp(2.8rem,6.4vw,5.6rem)] text-ivory">Experience the future.</h2>
        <p className="mt-4 max-w-[30rem] text-base leading-relaxed text-ivory-dim md:text-lg">
          Private viewings are held one at a time, at the studio or wherever you are.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="mailto:viewings@elstrom.example?subject=Private%20viewing" className="btn btn-primary">
            Schedule private viewing
          </a>
          <a href="mailto:hello@elstrom.example" className="btn btn-ghost">
            Contact
          </a>
        </div>
      </div>
    </Chapter>
  );
}
