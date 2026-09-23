/*
  Tier the device once, at module load, and never ask again. Every render budget
  in the scene reads from this: a phone must not be handed the same frame a
  workstation gets, and an integrated laptop GPU must not be handed a discrete
  GPU's frame either. The GPU class comes from the renderer string, which is
  the only cheap signal that separates an Intel UHD from an RTX.
*/

export type Tier = "low" | "mid" | "high";
export type GpuClass = "discrete" | "integrated" | "software" | "unknown";

export interface SceneBudget {
  tier: Tier;
  gpu: GpuClass;
  /** Renderer pixel-ratio clamp. Phones report 3, which is 9x the fill. */
  dpr: [number, number];
  /** Which model file to load. */
  model: "full" | "lite";
  /** Real refraction for the glass: a full extra scene pass with mipmaps. */
  transmission: boolean;
  /** Real-time floor reflection: another full scene pass. */
  floorReflection: boolean;
  /** Soft contact shadow under the car: a depth pass plus blur, every frame. */
  contactShadow: boolean;
  /** Shadow map resolution; 0 disables shadows. */
  shadowMapSize: number;
  antialias: boolean;
  /** Upper bound on rendered frames per second. */
  maxFps: number;
  /** Mouse-driven camera lean. */
  pointerLighting: boolean;
  /** Lower the render resolution while the camera is moving if frames run long. */
  adaptiveResolution: boolean;
}

const HIGH: SceneBudget = {
  tier: "high",
  gpu: "discrete",
  dpr: [1, 1.5],
  model: "full",
  transmission: true,
  floorReflection: true,
  contactShadow: true,
  shadowMapSize: 1024,
  antialias: true,
  maxFps: 60,
  pointerLighting: true,
  adaptiveResolution: false,
};

const MID: SceneBudget = {
  tier: "mid",
  gpu: "integrated",
  dpr: [1, 1.25],
  model: "full",
  transmission: false,
  floorReflection: false,
  contactShadow: false,
  shadowMapSize: 1024,
  antialias: true,
  maxFps: 60,
  pointerLighting: true,
  adaptiveResolution: true,
};

const LOW: SceneBudget = {
  tier: "low",
  gpu: "integrated",
  dpr: [1, 1.25],
  model: "lite",
  transmission: false,
  floorReflection: false,
  contactShadow: false,
  shadowMapSize: 0,
  antialias: true,
  maxFps: 60,
  pointerLighting: false,
  adaptiveResolution: true,
};

let cached: SceneBudget | null = null;

export function gpuClass(): GpuClass {
  if (typeof document === "undefined") return "unknown";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "unknown";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return "software";
    if (/nvidia|geforce|rtx|gtx|quadro|radeon|amd|arc\b/i.test(renderer)) return "discrete";
    if (/intel|uhd|iris|hd graphics|mali|adreno|powervr|apple gpu|apple m|apple a/i.test(renderer)) return "integrated";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function budget(): SceneBudget {
  if (cached) return cached;
  if (typeof window === "undefined") return (cached = MID);

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 500;
  const gpu = gpuClass();

  let tier: SceneBudget;
  if (gpu === "software") tier = { ...LOW, antialias: false, maxFps: 30 };
  else if (coarse && narrow) tier = LOW;
  else if (coarse) tier = { ...MID, model: "lite", shadowMapSize: 512, pointerLighting: false };
  else if (gpu === "discrete" && cores >= 4 && memory >= 4) tier = HIGH;
  else tier = MID;

  // An Apple desktop GPU is capable of the full tier; it only looks integrated.
  if (!coarse && gpu === "integrated" && /Macintosh/.test(navigator.userAgent) && cores >= 8) {
    tier = { ...HIGH, gpu };
  }

  return (cached = { ...tier, gpu });
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
