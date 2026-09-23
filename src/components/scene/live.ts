import * as THREE from "three";
import type { Targets } from "./director";

/*
  The smoothed, per-frame state of the scene. The director writes targets from
  scroll position; the render loop eases these values toward them and every
  component reads from here. Nothing in this file is React state on purpose:
  a value that changes sixty times a second must never trigger a render.
*/

export interface Live {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  daylight: number;
  rig: number;
  headlights: number;
  explode: number;
  xray: number;
  stage: number;
  speed: number;
  door: number;
  cabin: number;
  visible: number;
  orbit: number;
  /** Visitor's drag yaw in the studio, radians. */
  yaw: number;
  yawVelocity: number;
  /** Pointer, eased, -1..1 */
  px: number;
  py: number;
  /** Accumulated wheel rotation, radians. */
  wheelSpin: number;
  /** Seconds the scene has been running. */
  time: number;
  /** True while any value is still converging. */
  moving: boolean;
}

export const live: Live = {
  pos: new THREE.Vector3(3.6, 0.5, 8.2),
  look: new THREE.Vector3(0, 0.5, 0.8),
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
  yaw: 0,
  yawVelocity: 0,
  px: 0,
  py: 0,
  wheelSpin: 0,
  time: 0,
  moving: true,
};

const tmp = new THREE.Vector3();

/** Ease every live value toward its target; returns true if anything still moves. */
export function step(target: Targets, dt: number, pointer: { x: number; y: number }, lambda = 6) {
  // Capped so a tab that was hidden for a minute does not jump, but generous
  // enough that a throttled background tab (1 frame a second) still settles.
  const d = Math.min(dt, 0.5);
  let moving = false;

  const damp = (from: number, to: number, l = lambda) => {
    const v = THREE.MathUtils.damp(from, to, l, d);
    if (Math.abs(v - to) > 1e-4) moving = true;
    return Math.abs(v - to) < 1e-4 ? to : v;
  };

  tmp.set(...target.pos);
  live.pos.x = damp(live.pos.x, tmp.x);
  live.pos.y = damp(live.pos.y, tmp.y);
  live.pos.z = damp(live.pos.z, tmp.z);
  tmp.set(...target.look);
  live.look.x = damp(live.look.x, tmp.x);
  live.look.y = damp(live.look.y, tmp.y);
  live.look.z = damp(live.look.z, tmp.z);
  live.fov = damp(live.fov, target.fov);
  live.daylight = damp(live.daylight, target.daylight, 2.5);
  live.rig = damp(live.rig, target.rig, 3);
  live.headlights = damp(live.headlights, target.headlights, 3);
  live.explode = damp(live.explode, target.explode, 5);
  live.xray = damp(live.xray, target.xray, 4);
  live.stage = damp(live.stage, target.stage, 5);
  live.speed = damp(live.speed, target.speed, 2.5);
  live.door = damp(live.door, target.door, 4);
  live.cabin = damp(live.cabin, target.cabin, 4);
  live.visible = damp(live.visible, target.visible, 6);
  live.orbit = damp(live.orbit, target.orbit, 4);
  live.px = damp(live.px, pointer.x, 3);
  live.py = damp(live.py, pointer.y, 3);

  // The studio yaw coasts after a drag and returns to rest once we leave.
  if (live.orbit < 0.01 && Math.abs(live.yaw) > 1e-3) {
    live.yaw = damp(live.yaw, 0, 3);
  } else if (Math.abs(live.yawVelocity) > 1e-4) {
    live.yaw += live.yawVelocity * d;
    live.yawVelocity *= Math.pow(0.02, d);
    moving = true;
  }

  if (live.speed > 0.001) {
    // Wheel radius 0.384 m, and 40 m/s at full speed.
    live.wheelSpin += ((40 * live.speed) / 0.384) * d;
    moving = true;
  }

  live.time += d;
  live.moving = moving;
  return moving;
}
