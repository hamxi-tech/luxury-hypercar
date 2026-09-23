import { type Chapter } from "@/lib/store";

/*
  The camera director. Every chapter is a short shot list, and the scroll
  position inside the chapter is the playhead. Between shots the playhead is
  eased so the camera settles into each composition the way a commercial cuts
  between locked-off frames, and the whole result is damped in the render loop
  so a chapter change never snaps.

  The car sits at the origin with its nose along +Z, roof at y 1.15.
*/

export type V3 = [number, number, number];

interface Shot {
  t: number;
  pos: V3;
  look: V3;
  fov?: number;
}

export interface Targets {
  pos: V3;
  look: V3;
  fov: number;
  /** 0 night, 0.5 dawn, 1 day */
  daylight: number;
  /** 0 = the reveal's darkness (silhouette only), 1 = the full lighting rig. */
  rig: number;
  headlights: number;
  explode: number;
  xray: number;
  /** 0..4, how much of the intelligence map is lit. */
  stage: number;
  speed: number;
  door: number;
  /** Courtesy light in the cabin, on while the visitor is inside. */
  cabin: number;
  /** Whether the canvas should be visible at all. */
  visible: number;
  /** Visitor-controlled yaw is only honoured in the studio. */
  orbit: number;
}

const SHOTS: Record<Exclude<Chapter, "off">, Shot[]> = {
  reveal: [
    { t: 0, pos: [4.2, 0.5, 9.4], look: [-0.4, 0.5, 0.8], fov: 30 },
    { t: 0.5, pos: [3.4, 0.75, 7.4], look: [-0.5, 0.55, 0.5], fov: 30 },
    { t: 1, pos: [2.9, 1.0, 6.2], look: [-0.7, 0.5, 0.3], fov: 30 },
  ],
  exterior: [
    { t: 0, pos: [2.9, 1.0, 6.2], look: [-0.7, 0.5, 0.3], fov: 30 },
    { t: 0.22, pos: [7.4, 0.8, 0.6], look: [0, 0.55, 0.25], fov: 30 },
    { t: 0.45, pos: [3.2, 1.7, -4.4], look: [0, 0.5, 0.1], fov: 30 },
    { t: 0.7, pos: [2.6, 3.4, -3.2], look: [0, 0.6, 0.2], fov: 34 },
    { t: 0.86, pos: [2.2, 2.0, 3.6], look: [0, 0.6, 0.6], fov: 32 },
    { t: 1, pos: [1.7, 0.6, 3.6], look: [0.4, 0.6, 1.9], fov: 30 },
  ],
  performance: [
    { t: 0, pos: [2.8, 0.5, -4.2], look: [0, 0.6, 0.6], fov: 32 },
    { t: 0.45, pos: [6.4, 0.5, 0.8], look: [0, 0.55, 0.5], fov: 30 },
    { t: 0.75, pos: [2.2, 0.9, 4.8], look: [0, 0.6, 0.2], fov: 30 },
    { t: 1, pos: [0.4, 0.6, 5.4], look: [0, 0.6, 0.0], fov: 32 },
  ],
  intelligence: [
    { t: 0, pos: [3.6, 2.8, 4.4], look: [0, 0.5, 0.2], fov: 32 },
    { t: 0.5, pos: [0.9, 5.6, 1.6], look: [0, 0.4, 0.2], fov: 34 },
    { t: 1, pos: [-4.4, 2.6, -3.8], look: [0, 0.5, 0.2], fov: 32 },
  ],
  interior: [
    { t: 0, pos: [3.6, 1.05, 1.4], look: [0.3, 0.75, 0.4], fov: 34 },
    { t: 0.3, pos: [3.1, 1.35, -0.5], look: [-0.3, 0.6, 0.45], fov: 46 },
    { t: 0.55, pos: [0.0, 0.88, 0.15], look: [0, 0.62, 1.5], fov: 62 },
    { t: 0.78, pos: [0.0, 0.88, 0.15], look: [1.1, 0.75, 0.6], fov: 62 },
    { t: 1, pos: [0.0, 0.88, 0.12], look: [0, 1.05, 2.4], fov: 62 },
  ],
  studio: [{ t: 0, pos: [2.9, 0.95, 4.0], look: [0.55, 0.5, 0.25], fov: 30 }],
  showroom: [
    { t: 0, pos: [3.8, 1.2, 4.6], look: [0, 0.5, 0.2], fov: 30 },
    { t: 1, pos: [2.6, 0.85, 3.8], look: [0, 0.55, 0.25], fov: 30 },
  ],
};

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerp3(a: V3, b: V3, t: number): V3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
/** Linear ramp: 0 before a, 1 after b. */
function ramp(p: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

function shotAt(list: Shot[], p: number) {
  if (list.length === 1) return { pos: list[0].pos, look: list[0].look, fov: list[0].fov ?? 30 };
  let i = 0;
  while (i < list.length - 2 && p > list[i + 1].t) i++;
  const a = list[i];
  const b = list[i + 1];
  const t = easeInOut(ramp(p, a.t, b.t));
  return {
    pos: lerp3(a.pos, b.pos, t),
    look: lerp3(a.look, b.look, t),
    fov: lerp(a.fov ?? 30, b.fov ?? 30, t),
  };
}

const last: Targets = {
  pos: SHOTS.reveal[0].pos,
  look: SHOTS.reveal[0].look,
  fov: 30,
  daylight: 0,
  rig: 0,
  headlights: 0,
  explode: 0,
  xray: 0,
  stage: 0,
  speed: 0,
  door: 0,
  cabin: 0,
  visible: 1,
  orbit: 0,
};

export function targets(chapter: Chapter, p: number): Targets {
  if (chapter === "off") {
    return { ...last, visible: 0, speed: 0 };
  }
  const shot = shotAt(SHOTS[chapter], p);
  const out: Targets = {
    ...last,
    ...shot,
    visible: 1,
    explode: 0,
    xray: 0,
    stage: 0,
    speed: 0,
    door: 0,
    cabin: 0,
    orbit: 0,
  };

  switch (chapter) {
    case "reveal":
      out.daylight = 0;
      out.rig = ramp(p, 0.18, 0.75);
      out.headlights = ramp(p, 0.08, 0.3);
      break;
    case "exterior":
      out.daylight = 0;
      out.rig = 1;
      out.headlights = 1;
      // Lift the panels apart in the high rear shot, then let them settle.
      out.explode = ramp(p, 0.5, 0.66) * (1 - ramp(p, 0.8, 0.9));
      break;
    case "performance":
      out.rig = 1;
      out.headlights = 1;
      out.speed = ramp(p, 0.02, 0.22) * (1 - ramp(p, 0.86, 1));
      out.daylight = lerp(0, 0.34, ramp(p, 0.3, 1));
      break;
    case "intelligence":
      out.daylight = 0.34;
      out.rig = 1;
      out.headlights = 0.4;
      out.xray = ramp(p, 0.04, 0.2) * (1 - ramp(p, 0.9, 1));
      out.stage =
        ramp(p, 0.16, 0.26) + ramp(p, 0.36, 0.46) + ramp(p, 0.56, 0.66) + ramp(p, 0.74, 0.84);
      break;
    case "interior":
      out.daylight = lerp(0.34, 0.55, ramp(p, 0, 0.5));
      out.rig = 1;
      out.headlights = 0.4;
      out.door = ramp(p, 0.02, 0.26) * (1 - ramp(p, 0.5, 0.62));
      out.cabin = ramp(p, 0.08, 0.3);
      break;
    case "studio":
      out.daylight = 0.72;
      out.rig = 1;
      out.headlights = 0.25;
      out.orbit = 1;
      break;
    case "showroom":
      out.daylight = 1;
      out.rig = 1;
      out.headlights = 0.2;
      break;
  }
  Object.assign(last, out);
  return out;
}
