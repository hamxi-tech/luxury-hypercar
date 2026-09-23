"use client";
"use no memo";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { live } from "./live";

/*
  The environment is a small studio built from emissive panels, baked to a
  PMREM map. It is not an HDRI because it has to move: the visitor scrolls the
  night into a morning, and every panel's colour and the sky gradient are
  interpolated between three states and re-baked only when they have changed
  enough to be seen. Real lights sit alongside it for the shadows and for the
  headlamps, which are the one thing an environment map cannot do.

  Three states, in order of appearance:
    night: a dark hall, one long cool softbox overhead, a warm practical behind
    dawn:  a low band of first light on the horizon, cold blue above
    day:   a bright overcast studio
*/

type Rgb = [number, number, number];
interface State {
  skyTop: Rgb;
  skyHorizon: Rgb;
  ground: Rgb;
  horizonGlow: Rgb;
  horizonGlowPower: number;
  softbox: Rgb;
  softboxPower: number;
  side: Rgb;
  sidePower: number;
  practical: Rgb;
  practicalPower: number;
  fog: Rgb;
  floor: Rgb;
  keyColor: Rgb;
  keyPower: number;
  fillPower: number;
}

const NIGHT: State = {
  skyTop: [0.005, 0.006, 0.009],
  skyHorizon: [0.02, 0.024, 0.032],
  ground: [0.006, 0.007, 0.009],
  horizonGlow: [0.1, 0.13, 0.18],
  horizonGlowPower: 0.5,
  softbox: [0.72, 0.8, 0.9],
  softboxPower: 3.2,
  side: [0.35, 0.42, 0.52],
  sidePower: 1.2,
  practical: [1, 0.6, 0.3],
  practicalPower: 2.4,
  fog: [0.0032, 0.0038, 0.0052],
  floor: [0.0045, 0.005, 0.0065],
  keyColor: [0.8, 0.86, 0.95],
  keyPower: 1.4,
  fillPower: 0.08,
};

const DAWN: State = {
  skyTop: [0.03, 0.05, 0.12],
  skyHorizon: [0.55, 0.32, 0.26],
  ground: [0.06, 0.06, 0.08],
  horizonGlow: [1.0, 0.5, 0.28],
  horizonGlowPower: 2.6,
  softbox: [0.7, 0.72, 0.8],
  softboxPower: 0.9,
  side: [0.6, 0.45, 0.4],
  sidePower: 0.8,
  practical: [1, 0.7, 0.5],
  practicalPower: 0.6,
  fog: [0.04, 0.03, 0.045],
  floor: [0.05, 0.04, 0.05],
  keyColor: [1, 0.72, 0.5],
  keyPower: 2.4,
  fillPower: 0.25,
};

const DAY: State = {
  skyTop: [0.3, 0.34, 0.4],
  skyHorizon: [0.8, 0.82, 0.86],
  ground: [0.26, 0.28, 0.32],
  horizonGlow: [1, 1, 1],
  horizonGlowPower: 0.4,
  softbox: [1, 1, 1],
  softboxPower: 4,
  side: [0.9, 0.92, 0.96],
  sidePower: 1.6,
  practical: [1, 0.95, 0.9],
  practicalPower: 0.4,
  fog: [0.2, 0.215, 0.245],
  floor: [0.19, 0.2, 0.225],
  keyColor: [1, 0.98, 0.95],
  keyPower: 2.6,
  fillPower: 0.7,
};

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function mixN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Blend the three states by daylight, then scale by how far the rig has come up. */
export function stateAt(daylight: number, rig: number): State {
  const s = daylight < 0.5 ? blend(NIGHT, DAWN, daylight * 2) : blend(DAWN, DAY, (daylight - 0.5) * 2);
  // During the reveal the hall is black and only the practicals exist.
  const r = 0.04 + 0.96 * rig;
  return {
    ...s,
    softboxPower: s.softboxPower * r,
    sidePower: s.sidePower * r,
    horizonGlowPower: s.horizonGlowPower * r,
    keyPower: s.keyPower * r,
    fillPower: s.fillPower * r,
    skyTop: mix([0, 0, 0], s.skyTop, r),
    skyHorizon: mix([0, 0, 0], s.skyHorizon, r),
    ground: mix([0, 0, 0], s.ground, r),
  };
}
function blend(a: State, b: State, t: number): State {
  return {
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyHorizon: mix(a.skyHorizon, b.skyHorizon, t),
    ground: mix(a.ground, b.ground, t),
    horizonGlow: mix(a.horizonGlow, b.horizonGlow, t),
    horizonGlowPower: mixN(a.horizonGlowPower, b.horizonGlowPower, t),
    softbox: mix(a.softbox, b.softbox, t),
    softboxPower: mixN(a.softboxPower, b.softboxPower, t),
    side: mix(a.side, b.side, t),
    sidePower: mixN(a.sidePower, b.sidePower, t),
    practical: mix(a.practical, b.practical, t),
    practicalPower: mixN(a.practicalPower, b.practicalPower, t),
    fog: mix(a.fog, b.fog, t),
    floor: mix(a.floor, b.floor, t),
    keyColor: mix(a.keyColor, b.keyColor, t),
    keyPower: mixN(a.keyPower, b.keyPower, t),
    fillPower: mixN(a.fillPower, b.fillPower, t),
  };
}

const SKY_SHADER = {
  uniforms: {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    ground: { value: new THREE.Color() },
    glow: { value: new THREE.Color() },
    glowPower: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 glow; uniform float glowPower;
    varying vec3 vDir;
    void main() {
      float y = vDir.y;
      vec3 c = y > 0.0 ? mix(horizon, top, pow(y, 0.6)) : mix(horizon, ground, pow(-y, 0.5));
      // First light sits low on the horizon, strongest in front of the car.
      float band = exp(-abs(y) * 14.0);
      float front = 0.55 + 0.45 * max(0.0, vDir.z);
      c += glow * glowPower * band * front;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function LightRig({ resolution, shadowMapSize }: { resolution: number; shadowMapSize: number }) {
  const { gl, scene } = useThree();
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const baked = useRef({ daylight: -1, rig: -1 });
  const fogColor = useMemo(() => new THREE.Color(), []);

  const virtual = useMemo(() => {
    const s = new THREE.Scene();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(40, 32, 16),
      new THREE.ShaderMaterial({ ...SKY_SHADER, side: THREE.BackSide, depthWrite: false }),
    );
    (sky.material as THREE.ShaderMaterial).uniforms = THREE.UniformsUtils.clone(SKY_SHADER.uniforms);
    s.add(sky);

    const panel = (w: number, h: number) =>
      new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    // One long softbox above, along the length of the car.
    const softbox = panel(1.6, 9);
    softbox.position.set(0, 4.2, 0.3);
    softbox.rotation.x = Math.PI / 2;
    s.add(softbox);

    // Two tall strips either side, slightly behind the camera's usual position.
    const sideL = panel(0.5, 7);
    sideL.position.set(6.5, 1.6, 1);
    sideL.rotation.y = -Math.PI / 2;
    s.add(sideL);
    const sideR = sideL.clone();
    sideR.material = (sideL.material as THREE.MeshBasicMaterial).clone();
    sideR.position.x = -6.5;
    sideR.rotation.y = Math.PI / 2;
    s.add(sideR);

    // A warm practical low behind the car: the one warm note at night.
    const practical = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial());
    practical.position.set(-3, 0.9, -7);
    practical.lookAt(0, 0.6, 0);
    s.add(practical);

    return { scene: s, sky, softbox, sideL, sideR, practical };
  }, []);

  const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  useEffect(() => {
    pmrem.compileEquirectangularShader();
    return () => {
      pmrem.dispose();
      scene.environment?.dispose();
      scene.environment = null;
    };
  }, [pmrem, scene]);

  useFrame(() => {
    const { daylight, rig } = live;
    const changed =
      Math.abs(daylight - baked.current.daylight) > 0.006 || Math.abs(rig - baked.current.rig) > 0.01;
    const s = stateAt(daylight, rig);

    if (changed) {
      baked.current = { daylight, rig };
      const u = (virtual.sky.material as THREE.ShaderMaterial).uniforms;
      u.top.value.setRGB(...s.skyTop);
      u.horizon.value.setRGB(...s.skyHorizon);
      u.ground.value.setRGB(...s.ground);
      u.glow.value.setRGB(...s.horizonGlow);
      u.glowPower.value = s.horizonGlowPower;
      (virtual.softbox.material as THREE.MeshBasicMaterial).color.setRGB(...s.softbox).multiplyScalar(s.softboxPower);
      (virtual.sideL.material as THREE.MeshBasicMaterial).color.setRGB(...s.side).multiplyScalar(s.sidePower);
      (virtual.sideR.material as THREE.MeshBasicMaterial).color.setRGB(...s.side).multiplyScalar(s.sidePower);
      (virtual.practical.material as THREE.MeshBasicMaterial).color
        .setRGB(...s.practical)
        .multiplyScalar(s.practicalPower);

      const previous = scene.environment;
      const target = pmrem.fromScene(virtual.scene, 0, 0.1, 100);
      scene.environment = target.texture;
      previous?.dispose();
    }

    // The real lights follow the same states every frame; they are cheap.
    fogColor.setRGB(...s.fog);
    (scene.fog as THREE.Fog | null)?.color.copy(fogColor);
    (scene.background as THREE.Color | null)?.copy(fogColor);
    if (key.current) {
      key.current.color.setRGB(...s.keyColor);
      key.current.intensity = s.keyPower;
      // The key light swings from a high cool overhead at night to a low warm
      // front-side light at dawn, and back up for day.
      const dawn = 1 - Math.abs(daylight - 0.5) * 2;
      key.current.position.set(3 + dawn * 3, 6 - dawn * 4.8, 4 + dawn * 4);
    }
    if (fill.current) fill.current.intensity = s.fillPower;
  });

  return (
    <>
      <directionalLight
        ref={key}
        position={[3, 6, 4]}
        intensity={1.4}
        castShadow={shadowMapSize > 0}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <hemisphereLight ref={fill} args={["#b8c4d2", "#0b0d11", 0.08]} />
      <fog attach="fog" args={["#0b0d11", 9, 34]} />
      <color attach="background" args={["#0b0d11"]} />
      {/* The resolution prop is applied when the rig is created, so it is read once. */}
      <group userData={{ resolution }} />
    </>
  );
}
