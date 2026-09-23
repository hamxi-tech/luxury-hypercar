/*
  Tier the device once, at module load, and never ask again. Every render budget
  in the scene reads from this: a phone must not be handed the same frame a
  workstation gets.
*/

export type Tier = "low" | "mid" | "high";

export interface SceneBudget {
  tier: Tier;
  /** Renderer pixel-ratio clamp. Phones report 3, which is 9x the fill. */
  dpr: [number, number];
  /** Environment map resolution for the lighting rig. */
  environmentResolution: number;
  /** Real-time floor reflection (an extra full render pass). */
  floorReflection: boolean;
  /** Shadow map resolution; 0 disables shadows. */
  shadowMapSize: number;
  /** Segments along the lofted body. Controls silhouette smoothness. */
  bodySegments: number;
  antialias: boolean;
  /** Upper bound on rendered frames per second. */
  maxFps: number;
  /** Mouse-driven light parallax and reflection sweep. */
  pointerLighting: boolean;
}

const HIGH: SceneBudget = {
  tier: "high",
  dpr: [1, 1.75],
  environmentResolution: 256,
  floorReflection: true,
  shadowMapSize: 2048,
  bodySegments: 160,
  antialias: true,
  maxFps: 60,
  pointerLighting: true,
};

const MID: SceneBudget = {
  tier: "mid",
  dpr: [1, 1.5],
  environmentResolution: 128,
  floorReflection: false,
  shadowMapSize: 1024,
  bodySegments: 120,
  antialias: true,
  maxFps: 60,
  pointerLighting: true,
};

const LOW: SceneBudget = {
  tier: "low",
  dpr: [1, 1.25],
  environmentResolution: 64,
  floorReflection: false,
  shadowMapSize: 0,
  bodySegments: 90,
  antialias: false,
  maxFps: 30,
  pointerLighting: false,
};

let cached: SceneBudget | null = null;

export function budget(): SceneBudget {
  if (cached) return cached;
  if (typeof window === "undefined") return (cached = MID);

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 500;

  if (coarse && narrow && (cores <= 6 || memory <= 4)) return (cached = LOW);
  if (coarse || cores <= 4 || memory <= 4) return (cached = MID);
  return (cached = HIGH);
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Crawlers and audit tools get the poster, never the three.js chunk. */
const BOTS =
  /bot|crawler|spider|crawling|lighthouse|chrome-lighthouse|headlesschrome|pagespeed|gtmetrix|slurp|bingpreview|facebookexternalhit|embedly/i;

export function isBot() {
  if (typeof navigator === "undefined") return true;
  return BOTS.test(navigator.userAgent);
}
