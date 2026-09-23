"use client";
"use no memo";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { live } from "./live";
import { getConfig, INTERIORS, PAINTS, subscribeConfig, WHEELS } from "@/lib/store";

/*
  The vehicle is a licensed concept-car model (see docs/ASSETS.md) with every
  material replaced. What the file provides is geometry and baked occlusion;
  paint, glass, interior, lamps and the way the car comes apart are ours.

  On load the model is reorganised once: the parts that move (wheels, doors,
  hood, roof, rear clamshell, windshield) are re-parented into world-aligned
  groups so that spinning a wheel or lifting a panel is a one-line transform,
  and every material is catalogued so the x-ray fade and the configurator can
  reach them without walking the tree again.
*/

const MODEL = "/models/aubade.glb";
useGLTF.preload(MODEL, "/draco/");

type Part = {
  group: THREE.Group;
  /** World-space offset at full explode. */
  offset: THREE.Vector3;
};

interface Catalogue {
  wheels: THREE.Group[];
  parts: Part[];
  doorL: THREE.Object3D | null;
  fadeMaterials: THREE.Material[];
  paint: THREE.MeshPhysicalMaterial;
  trim: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  headlight: THREE.MeshStandardMaterial;
  brakelight: THREE.MeshStandardMaterial;
  signal: THREE.MeshStandardMaterial;
  interiorAccent: THREE.MeshStandardMaterial;
  interiorTrim: THREE.MeshStandardMaterial;
  dashboard: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
}

const EXPLODE: Record<string, [number, number, number]> = {
  BodyHood: [0, 0.22, 0.5],
  BodyRoofPanel: [0, 0.55, 0],
  BodyWindshield: [0, 0.4, 0.28],
  BodyDoorLColor1: [0.6, 0.12, 0],
  BodyDoorRColor1: [-0.6, 0.12, 0],
  BodyRearPanelsColor1: [0, 0.18, -0.6],
};

function reorganise(root: THREE.Group, budget: { transmission: boolean }): Catalogue {
  const wheels: THREE.Group[] = [];
  const parts: Part[] = [];
  let doorL: THREE.Object3D | null = null;
  const byName = new Map<string, THREE.Object3D>();
  root.traverse((o) => byName.set(o.name, o));

  const paint = new THREE.MeshPhysicalMaterial({ name: "paint" });
  const trim = new THREE.MeshPhysicalMaterial({
    name: "trim",
    color: "#15171b",
    metalness: 0.55,
    roughness: 0.42,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    name: "glass",
    color: "#6f7f8f",
    metalness: 0,
    roughness: 0.04,
    transmission: budget.transmission ? 0.92 : 0,
    thickness: 0.02,
    ior: 1.5,
    transparent: !budget.transmission,
    opacity: budget.transmission ? 1 : 0.45,
    envMapIntensity: 1.4,
  });
  const headlight = new THREE.MeshStandardMaterial({
    name: "headlight",
    color: "#0a0c10",
    emissive: new THREE.Color("#cfe4f6"),
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const brakelight = new THREE.MeshStandardMaterial({
    name: "brakelight",
    color: "#1a0406",
    emissive: new THREE.Color("#ff2a1e"),
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const signal = new THREE.MeshStandardMaterial({
    name: "signal",
    color: "#1a0d06",
    emissive: new THREE.Color("#ff7a2a"),
    emissiveIntensity: 0.15,
    roughness: 0.3,
  });
  const interiorAccent = new THREE.MeshStandardMaterial({ name: "interiorAccent", roughness: 0.62 });
  const interiorTrim = new THREE.MeshStandardMaterial({ name: "interiorTrim", color: "#1b1c1f", roughness: 0.6 });
  const dashboard = new THREE.MeshStandardMaterial({
    name: "dashboard",
    color: "#0c0d10",
    emissive: new THREE.Color("#9fc4dc"),
    emissiveIntensity: 0.3,
    roughness: 0.5,
  });
  const rim = new THREE.MeshStandardMaterial({ name: "rim", metalness: 1, roughness: 0.25 });
  const mechanical = new THREE.MeshStandardMaterial({ name: "mechanical", color: "#111215", metalness: 0.6, roughness: 0.7 });
  const tyre = new THREE.MeshStandardMaterial({ name: "tyre", color: "#0d0e10", roughness: 0.85 });
  const disc = new THREE.MeshStandardMaterial({ name: "disc", color: "#8a8d92", metalness: 1, roughness: 0.55 });
  const caliper = new THREE.MeshStandardMaterial({ name: "caliper", color: "#22262c", metalness: 0.6, roughness: 0.4 });
  const mirror = new THREE.MeshStandardMaterial({ name: "mirror", color: "#9a9ea6", metalness: 1, roughness: 0.35 });

  const replace: Record<string, THREE.Material> = {
    "Paint 1 Carmine": paint,
    "Paint 2 Carmine": trim,
    Glass: glass,
    Headlight: headlight,
    Brakelight: brakelight,
    Signallight: signal,
    "Interior 3 Carmine": interiorAccent,
    "Interior 1": interiorTrim,
    "Interior 2": interiorTrim,
    "Panel Sides": interiorTrim,
    Floormat: interiorTrim,
    Dashboard: dashboard,
    Rim2: rim,
    Rim1: trim,
    Mechanical: mechanical,
    Hardware: caliper,
    Trim: trim,
    Tireside: tyre,
    Tiretread: tyre,
    Disc: disc,
    Brake: caliper,
    Mirror: mirror,
  };

  // Every replacement keeps the file's baked occlusion and normal detail.
  const carry = (from: THREE.MeshStandardMaterial, to: THREE.MeshStandardMaterial) => {
    if (from.aoMap && !to.aoMap) {
      to.aoMap = from.aoMap;
      to.aoMapIntensity = 1;
    }
    if (from.normalMap && !to.normalMap && to !== glass) {
      to.normalMap = from.normalMap;
      to.normalScale.copy(from.normalScale);
    }
    to.needsUpdate = true;
  };

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      const std = m as THREE.MeshStandardMaterial;
      const r = replace[std.name] as THREE.MeshStandardMaterial | undefined;
      if (!r) return m;
      carry(std, r);
      return r;
    });
    o.material = Array.isArray(o.material) ? next : next[0];
  });

  // Wheels: keep their world transform, but give them a world-aligned parent to spin.
  for (const name of ["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"]) {
    const node = byName.get(name);
    if (!node) continue;
    const g = new THREE.Group();
    g.name = `${name}Spin`;
    node.getWorldPosition(g.position);
    root.add(g);
    g.attach(node);
    g.userData.side = g.position.x > 0 ? 1 : -1;
    wheels.push(g);
  }

  for (const [name, offset] of Object.entries(EXPLODE)) {
    const node = byName.get(name);
    if (!node) continue;
    const g = new THREE.Group();
    g.name = `${name}Part`;
    root.add(g);
    g.attach(node);
    parts.push({ group: g, offset: new THREE.Vector3(...offset) });
    if (name === "BodyDoorLColor1") doorL = node;
  }

  const fadeMaterials = Array.from(new Set(Object.values(replace)));

  return {
    wheels,
    parts,
    doorL,
    fadeMaterials,
    paint,
    trim,
    glass,
    headlight,
    brakelight,
    signal,
    interiorAccent,
    interiorTrim,
    dashboard,
    rim,
  };
}

export function Vehicle({
  transmission,
  onReady,
}: {
  transmission: boolean;
  onReady?: () => void;
}) {
  const gltf = useGLTF(MODEL, "/draco/");
  const group = useRef<THREE.Group>(null);
  const model = useMemo(() => gltf.scene, [gltf.scene]);
  // Reorganising is done once per loaded model and cached on it. React runs
  // memo callbacks twice in development, and a second pass would re-parent the
  // moving parts into fresh groups while the loop kept driving the first ones.
  const catalogue = useMemo(() => {
    const data = model.userData as { catalogue?: Catalogue };
    if (!data.catalogue) data.catalogue = reorganise(model, { transmission });
    return data.catalogue;
  }, [model, transmission]);
  const doorRest = useRef(0);
  const flakeMap = useRef<THREE.Texture | null>(null);

  const applyConfig = useCallback(() => {
    const c = getConfig();
    const p = PAINTS[c.paint];
    const w = WHEELS[c.wheel];
    const i = INTERIORS[c.interior];
    const paint = catalogue.paint;
    paint.color.set(p.color);
    paint.metalness = p.metalness;
    paint.roughness = p.roughness;
    paint.clearcoat = p.clearcoat;
    paint.clearcoatRoughness = 0.08;
    paint.envMapIntensity = 1.1;
    if (flakeMap.current) {
      paint.normalMap = p.flake > 0 ? flakeMap.current : null;
      paint.normalScale.set(p.flake, p.flake);
    }
    paint.needsUpdate = true;

    catalogue.rim.color.set(w.finish);
    catalogue.rim.roughness = w.id === "meridian" ? 0.18 : 0.32;
    catalogue.interiorAccent.color.set(i.leather);
    catalogue.interiorTrim.color.set(i.trim);
    catalogue.dashboard.emissive.set(i.glow);
  }, [catalogue]);

  // A tiny procedural flake normal map for the metallic paints.
  useEffect(() => {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const nx = (Math.random() - 0.5) * 0.35;
      const ny = (Math.random() - 0.5) * 0.35;
      data[i * 4] = 128 + nx * 127;
      data[i * 4 + 1] = 128 + ny * 127;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 60);
    tex.needsUpdate = true;
    flakeMap.current = tex;
    applyConfig();
    return () => tex.dispose();
  }, [applyConfig]);


  useEffect(() => {
    applyConfig();
    const unsubscribe = subscribeConfig(applyConfig);
    onReady?.();
    return unsubscribe;
  }, [applyConfig, onReady]);

  useEffect(() => {
    if (catalogue.doorL) doorRest.current = catalogue.doorL.rotation.z;
  }, [catalogue]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = live.yaw;

    // Wheels spin with the speed value and step outward with the explode.
    for (const w of catalogue.wheels) {
      w.rotation.x = live.wheelSpin;
      if (w.userData.baseX === undefined) {
        w.userData.baseX = w.position.x;
        w.userData.baseY = w.position.y;
      }
      w.position.x = w.userData.baseX + w.userData.side * 0.42 * live.explode;
      w.position.y = w.userData.baseY - 0.02 * live.explode;
    }
    for (const p of catalogue.parts) {
      p.group.position.copy(p.offset).multiplyScalar(live.explode);
    }
    if (catalogue.doorL) {
      catalogue.doorL.rotation.z = doorRest.current - live.door * 1.15;
    }

    const x = live.xray;
    for (const m of catalogue.fadeMaterials) {
      const wantTransparent = x > 0.001 || m === catalogue.glass;
      if (m.transparent !== wantTransparent) {
        m.transparent = wantTransparent;
        m.needsUpdate = true;
      }
      const base = m === catalogue.glass && !transmission ? 0.45 : 1;
      m.opacity = base * (1 - x * 0.94);
      m.depthWrite = x < 0.5;
    }
    // Refraction ignores opacity, so the glass has to give up its transmission
    // for the x-ray and take it back afterwards.
    if (transmission) catalogue.glass.transmission = 0.92 * (1 - x);

    catalogue.headlight.emissiveIntensity = live.headlights * 9;
    catalogue.brakelight.emissiveIntensity = 0.4 + live.headlights * 2.2 + live.speed * 1.5;
    catalogue.signal.emissiveIntensity = 0.1 + live.headlights * 0.3;
    catalogue.dashboard.emissiveIntensity = 0.18 + (1 - live.daylight) * 0.3;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      <Headlamps />
      <CabinLight />
    </group>
  );
}

/* A courtesy light over the centre seat; on while the visitor is inside. */
function CabinLight() {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (light.current) light.current.intensity = live.cabin * 2.2;
  });
  return <pointLight ref={light} position={[0, 1.06, 0.55]} color="#f2e6d6" distance={3} decay={1.8} intensity={0} />;
}

/*
  Two spotlights and two additive cones stand in for the beams. The emissive
  strip is the lamp; these are what the lamp does to the world.
*/
function Headlamps() {
  const left = useRef<THREE.SpotLight>(null);
  const right = useRef<THREE.SpotLight>(null);
  const cones = useRef<THREE.Group>(null);
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 0.1, 14);
    return t;
  }, []);

  const coneMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { power: { value: 0 }, tint: { value: new THREE.Color("#a9c8e0") } },
        vertexShader: /* glsl */ `
          varying float vT; varying vec3 vN; varying vec3 vV;
          void main() {
            vT = uv.y;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float power; uniform vec3 tint; varying float vT; varying vec3 vN; varying vec3 vV;
          void main() {
            float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
            float fall = pow(1.0 - vT, 2.2);
            gl_FragColor = vec4(tint, 1.0) * power * edge * fall * 0.35;
          }
        `,
      }),
    [],
  );

  useFrame(() => {
    const p = live.headlights * (1 - live.xray * 0.8);
    if (left.current) left.current.intensity = p * 60;
    if (right.current) right.current.intensity = p * 60;
    coneMaterial.uniforms.power.value = p * (1 - live.daylight * 0.85);
    if (cones.current) cones.current.visible = p > 0.01;
  });

  const cone = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 5.0]}>
      <coneGeometry args={[1.6, 10, 24, 1, true]} />
      <primitive object={coneMaterial} attach="material" />
    </mesh>
  );

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={left}
        position={[0.62, 0.65, 2.2]}
        target={target}
        angle={0.42}
        penumbra={0.7}
        distance={26}
        decay={1.6}
        color="#cfe4f6"
      />
      <spotLight
        ref={right}
        position={[-0.62, 0.65, 2.2]}
        target={target}
        angle={0.42}
        penumbra={0.7}
        distance={26}
        decay={1.6}
        color="#cfe4f6"
      />
      <group ref={cones}>
        <group position={[0.62, 0.62, 2.2]} rotation={[0.04, 0, 0]}>
          {cone}
        </group>
        <group position={[-0.62, 0.62, 2.2]} rotation={[0.04, 0, 0]}>
          {cone}
        </group>
      </group>
    </>
  );
}
