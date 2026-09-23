"use client";
"use no memo";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { live } from "./live";

/*
  Motion without moving the car. The hall's light fittings stream past in two
  rows, the floor markings stream with them, and both fade with the speed value
  so the performance chapter starts and ends at rest. Everything here is one
  instanced draw call per row.
*/

const COUNT = 28;
const SPAN = 70;

export function Speed() {
  const lights = useRef<THREE.InstancedMesh>(null);
  const marks = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const out: { x: number; y: number; z: number; len: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      out.push({
        x: side * (4.2 + Math.random() * 3.5),
        y: 0.4 + Math.random() * 2.6,
        z: (i / COUNT) * SPAN - SPAN / 2 + Math.random() * 2,
        len: 2 + Math.random() * 3,
      });
    }
    return out;
  }, []);
  const markSeeds = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      out.push({ x: (i % 2 === 0 ? 1 : -1) * 2.35, z: (i / COUNT) * SPAN - SPAN / 2 });
    }
    return out;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lightMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#9fc4dc").multiplyScalar(0.9),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const markMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#5f8ba6",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const s = live.speed;
    const visible = s > 0.002;
    if (lights.current) lights.current.visible = visible;
    if (marks.current) marks.current.visible = visible;
    if (!visible) return;

    const travel = live.time * 46 * s;
    const stretch = 1 + s * 5;

    if (lights.current) {
      seeds.forEach((p, i) => {
        let z = ((p.z - travel) % SPAN) + SPAN;
        z = (z % SPAN) - SPAN / 2;
        dummy.position.set(p.x, p.y, z);
        dummy.scale.set(1, 1, p.len * stretch);
        dummy.updateMatrix();
        lights.current!.setMatrixAt(i, dummy.matrix);
      });
      lights.current.instanceMatrix.needsUpdate = true;
      lightMat.opacity = 0.42 * s * (1 - live.daylight * 0.6);
    }
    if (marks.current) {
      markSeeds.forEach((p, i) => {
        let z = ((p.z - travel * 1.1) % SPAN) + SPAN;
        z = (z % SPAN) - SPAN / 2;
        dummy.position.set(p.x, 0.005, z);
        dummy.scale.set(1, 1, 1.2 * stretch);
        dummy.updateMatrix();
        marks.current!.setMatrixAt(i, dummy.matrix);
      });
      marks.current.instanceMatrix.needsUpdate = true;
      markMat.opacity = 0.22 * s;
    }
  });

  return (
    <>
      <instancedMesh ref={lights} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.02, 1]} />
        <primitive object={lightMat} attach="material" />
      </instancedMesh>
      <instancedMesh
        ref={marks}
        args={[undefined, undefined, COUNT]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.05, 1]} />
        <primitive object={markMat} attach="material" />
      </instancedMesh>
    </>
  );
}
