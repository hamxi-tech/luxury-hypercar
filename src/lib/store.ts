/*
  Continuous values that change every frame live here, outside React. Scroll
  progress, pointer position and the director's current shot are read inside
  the render loop; the configurator's discrete choices are read through
  useSyncExternalStore because they change a handful of times per visit.
*/

export type Chapter =
  | "reveal"
  | "exterior"
  | "performance"
  | "intelligence"
  | "interior"
  | "studio"
  | "showroom"
  | "off";

export interface FrameState {
  chapter: Chapter;
  /** 0..1 progress through the current chapter's pinned scroll. */
  progress: number;
  /** Normalised pointer, -1..1 on both axes; eased by the scene, not here. */
  pointerX: number;
  pointerY: number;
  /** Time of day the environment should show: 0 night, 0.5 dawn, 1 day. */
  daylight: number;
  /** Set to true whenever anything wants a new frame drawn. */
  dirty: boolean;
}

export const frame: FrameState = {
  chapter: "reveal",
  progress: 0,
  pointerX: 0,
  pointerY: 0,
  daylight: 0,
  dirty: true,
};

/*
  The reveal plays by itself: on arrival the intro value runs 0..1 over a few
  seconds, and the reveal chapter's progress is whichever is further along, the
  intro or the scroll. A visitor who never scrolls still sees the car arrive; a
  visitor who scrolls straight away is never held back.
*/
let intro = 0;
let scrollProgress = 0;
let scrollChapter: Chapter = "reveal";

export function getIntro() {
  return intro;
}
export function setIntro(value: number) {
  intro = Math.min(1, Math.max(0, value));
  resolve();
}

export function setChapter(chapter: Chapter, progress: number) {
  scrollChapter = chapter;
  scrollProgress = progress;
  resolve();
}

function resolve() {
  const progress = scrollChapter === "reveal" ? Math.max(scrollProgress, intro) : scrollProgress;
  if (frame.chapter !== scrollChapter || frame.progress !== progress) {
    frame.chapter = scrollChapter;
    frame.progress = progress;
    frame.dirty = true;
    notifyFrame();
  }
}

export function setPointer(x: number, y: number) {
  frame.pointerX = x;
  frame.pointerY = y;
  frame.dirty = true;
  notifyFrame();
}

export function setDaylight(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped !== frame.daylight) {
    frame.daylight = clamped;
    frame.dirty = true;
    notifyFrame();
  }
}

const frameListeners = new Set<() => void>();
export function subscribeFrame(listener: () => void) {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}
function notifyFrame() {
  frameListeners.forEach((l) => l());
}

/* ---------------- Configurator (discrete, React-visible) ---------------- */

export interface Paint {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  flake: number;
  swatch: string;
}

export const PAINTS: Paint[] = [
  {
    id: "fjord",
    name: "Midnight Fjord",
    color: "#0e1a2b",
    metalness: 0.75,
    roughness: 0.28,
    clearcoat: 1,
    flake: 0.14,
    swatch: "linear-gradient(135deg,#1b2f4b 0%,#0a1220 100%)",
  },
  {
    id: "glacier",
    name: "Glacier Silver",
    color: "#c9ced3",
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 1,
    flake: 0.2,
    swatch: "linear-gradient(135deg,#eef1f3 0%,#9aa2aa 100%)",
  },
  {
    id: "aubade",
    name: "Aubade Copper",
    color: "#6b3a26",
    metalness: 0.85,
    roughness: 0.3,
    clearcoat: 1,
    flake: 0.22,
    swatch: "linear-gradient(135deg,#b56a44 0%,#4a2617 100%)",
  },
  {
    id: "basalt",
    name: "Basalt Matte",
    color: "#2a2c30",
    metalness: 0.2,
    roughness: 0.72,
    clearcoat: 0.15,
    flake: 0,
    swatch: "linear-gradient(135deg,#3b3e44 0%,#1d1f23 100%)",
  },
];

export interface Wheel {
  id: string;
  name: string;
  spokes: number;
  spokeWidth: number;
  finish: string;
  description: string;
}

export const WHEELS: Wheel[] = [
  {
    id: "turbine",
    name: "Turbine",
    spokes: 9,
    spokeWidth: 0.055,
    finish: "#2a2d33",
    description: "Nine blades, dark satin",
  },
  {
    id: "meridian",
    name: "Meridian",
    spokes: 5,
    spokeWidth: 0.11,
    finish: "#b7bcc3",
    description: "Five spokes, machined",
  },
  {
    id: "aero",
    name: "Aero Disc",
    spokes: 20,
    spokeWidth: 0.045,
    finish: "#16181c",
    description: "Closed face, lowest drag",
  },
];

export interface Interior {
  id: string;
  name: string;
  leather: string;
  stitch: string;
  trim: string;
  glow: string;
  description: string;
}

export const INTERIORS: Interior[] = [
  {
    id: "ash",
    name: "Ash",
    leather: "#2b2b2d",
    stitch: "#9fc4dc",
    trim: "#3a3d42",
    glow: "#9fc4dc",
    description: "Charcoal leather, ice stitch",
  },
  {
    id: "birch",
    name: "Birch",
    leather: "#c9bfae",
    stitch: "#1d1f23",
    trim: "#8c7a63",
    glow: "#e6d9c4",
    description: "Pale leather, oak trim",
  },
  {
    id: "ember",
    name: "Ember",
    leather: "#3b1f1a",
    stitch: "#d08a5a",
    trim: "#26191a",
    glow: "#e0a070",
    description: "Oxblood leather, copper stitch",
  },
];

export interface Configuration {
  paint: number;
  wheel: number;
  interior: number;
}

let config: Configuration = { paint: 0, wheel: 0, interior: 0 };
const configListeners = new Set<() => void>();

export function getConfig() {
  return config;
}
export function setConfig(patch: Partial<Configuration>) {
  config = { ...config, ...patch };
  frame.dirty = true;
  configListeners.forEach((l) => l());
  notifyFrame();
}
export function subscribeConfig(listener: () => void) {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
}
export const DEFAULT_CONFIG: Configuration = { paint: 0, wheel: 0, interior: 0 };
