"use client";
"use no memo";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import { live } from "./live";

/*
  The intelligence map: what is inside the car when the body fades. It is a
  nervous system in the literal sense, and it lights up in the order a nervous
  system works.

    stage 1  sense       the sensors wake, and their signals run to the core
    stage 2  understand  the core comes up
    stage 3  decide      instructions run from the core to the actuators
    stage 4  act         motors, brakes, aero and the battery answer

  Every line joins two real components; nothing is drawn for decoration.
*/

type V3 = [number, number, number];

interface Node {
  id: string;
  p: V3;
  r: number;
  stage: 1 | 2 | 4;
  kind: "sensor" | "core" | "motor" | "aero" | "battery";
}

const CORE: V3 = [0, 0.5, -0.95];

const NODES: Node[] = [
  { id: "lidar", p: [0, 0.62, 2.3], r: 0.045, stage: 1, kind: "sensor" },
  { id: "roofcam", p: [0, 1.16, 0.15], r: 0.035, stage: 1, kind: "sensor" },
  { id: "mirrorL", p: [1.12, 0.93, 0.85], r: 0.03, stage: 1, kind: "sensor" },
  { id: "mirrorR", p: [-1.12, 0.93, 0.85], r: 0.03, stage: 1, kind: "sensor" },
  { id: "rearradar", p: [0, 0.68, -1.95], r: 0.035, stage: 1, kind: "sensor" },
  { id: "wsFL", p: [0.98, 0.38, 1.49], r: 0.03, stage: 1, kind: "sensor" },
  { id: "wsFR", p: [-0.98, 0.38, 1.49], r: 0.03, stage: 1, kind: "sensor" },
  { id: "wsRL", p: [0.98, 0.38, -1.31], r: 0.03, stage: 1, kind: "sensor" },
  { id: "wsRR", p: [-0.98, 0.38, -1.31], r: 0.03, stage: 1, kind: "sensor" },
  { id: "core", p: CORE, r: 0.11, stage: 2, kind: "core" },
  { id: "mFL", p: [0.6, 0.38, 1.49], r: 0.07, stage: 4, kind: "motor" },
  { id: "mFR", p: [-0.6, 0.38, 1.49], r: 0.07, stage: 4, kind: "motor" },
  { id: "mRL", p: [0.6, 0.38, -1.31], r: 0.085, stage: 4, kind: "motor" },
  { id: "mRR", p: [-0.6, 0.38, -1.31], r: 0.085, stage: 4, kind: "motor" },
  { id: "wing", p: [0, 0.98, -1.75], r: 0.04, stage: 4, kind: "aero" },
  { id: "flapL", p: [0.62, 0.34, 2.15], r: 0.03, stage: 4, kind: "aero" },
  { id: "flapR", p: [-0.62, 0.34, 2.15], r: 0.03, stage: 4, kind: "aero" },
];

interface Link {
  from: V3;
  to: V3;
  stage: 1 | 3 | 4;
  weight: number;
}

const byId = Object.fromEntries(NODES.map((n) => [n.id, n.p])) as Record<string, V3>;

const LINKS: Link[] = [
  ...["lidar", "roofcam", "mirrorL", "mirrorR", "rearradar", "wsFL", "wsFR", "wsRL", "wsRR"].map(
    (id) => ({ from: byId[id], to: CORE, stage: 1 as const, weight: 1.6 }),
  ),
  ...["mFL", "mFR", "mRL", "mRR", "wing", "flapL", "flapR"].map((id) => ({
    from: CORE,
    to: byId[id],
    stage: 3 as const,
    weight: 2.2,
  })),
  // Battery bus: the pack feeds each motor.
  { from: [0.45, 0.22, 0.9], to: byId.mFL, stage: 4, weight: 3 },
  { from: [-0.45, 0.22, 0.9], to: byId.mFR, stage: 4, weight: 3 },
  { from: [0.45, 0.22, -0.9], to: byId.mRL, stage: 4, weight: 3 },
  { from: [-0.45, 0.22, -0.9], to: byId.mRR, stage: 4, weight: 3 },
  { from: [0, 0.22, -0.6], to: CORE, stage: 4, weight: 3 },
];

/** A gentle arc between two points, lifted through the car's interior volume. */
function arc(from: V3, to: V3, lift: number) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const points = curve.getPoints(24);
  return { points, length: curve.getLength() };
}

const ICE = new THREE.Color("#9fc4dc");

export function Intelligence() {
  const lines = useRef<(Line2 | null)[]>([]);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const cells = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);

  const arcs = useMemo(
    () =>
      LINKS.map((l) => {
        const lift = l.stage === 4 ? -0.02 : 0.28;
        return { ...l, ...arc(l.from, l.to, lift) };
      }),
    [],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const nodeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ICE,
        transparent: true,
        opacity: 1,
        toneMapped: false,
      }),
    [],
  );
  const cellMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ICE,
        transparent: true,
        toneMapped: false,
      }),
    [],
  );

  // Battery cells: a floor of 6 x 12 modules under the cabin.
  const CELLS = 72;

  useFrame(() => {
    const x = live.xray;
    if (group.current) group.current.visible = x > 0.01;
    if (x <= 0.01) return;

    const stage = live.stage;
    const pulse = 0.85 + 0.15 * Math.sin(live.time * 3.2);

    if (nodesRef.current) {
      NODES.forEach((n, i) => {
        const on = THREE.MathUtils.clamp(stage - (n.stage - 1), 0, 1);
        const scale = n.r * (0.2 + 0.8 * on) * (n.kind === "core" ? pulse : 1);
        dummy.position.set(...n.p);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        nodesRef.current!.setMatrixAt(i, dummy.matrix);
        color.copy(ICE).multiplyScalar(0.25 + 2.2 * on * x);
        nodesRef.current!.setColorAt(i, color);
      });
      nodesRef.current.instanceMatrix.needsUpdate = true;
      if (nodesRef.current.instanceColor) nodesRef.current.instanceColor.needsUpdate = true;
    }

    if (cells.current) {
      const on = THREE.MathUtils.clamp(stage - 3, 0, 1);
      for (let i = 0; i < CELLS; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const wave = 0.6 + 0.4 * Math.sin(live.time * 2 + row * 0.5);
        dummy.position.set((col - 2.5) * 0.17, 0.2, (row - 5.5) * 0.17);
        dummy.scale.setScalar(0.2 + 0.8 * on);
        dummy.updateMatrix();
        cells.current.setMatrixAt(i, dummy.matrix);
        color.copy(ICE).multiplyScalar((0.1 + 1.1 * on * wave) * x);
        cells.current.setColorAt(i, color);
      }
      cells.current.instanceMatrix.needsUpdate = true;
      if (cells.current.instanceColor) cells.current.instanceColor.needsUpdate = true;
    }

    arcs.forEach((a, i) => {
      const line = lines.current[i];
      if (!line) return;
      const p = THREE.MathUtils.clamp(stage - (a.stage - 1), 0, 1);
      const mat = line.material;
      mat.dashOffset = a.length * (1 - p);
      mat.opacity = x * (a.stage === 4 ? 0.9 : 0.75);
      line.visible = p > 0.001;
    });
  });

  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, NODES.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 18, 12]} />
        <primitive object={nodeMaterial} attach="material" />
      </instancedMesh>
      <instancedMesh ref={cells} args={[undefined, undefined, CELLS]} frustumCulled={false}>
        <boxGeometry args={[0.12, 0.03, 0.12]} />
        <primitive object={cellMaterial} attach="material" />
      </instancedMesh>
      {arcs.map((a, i) => (
        <Line
          key={i}
          ref={(el) => {
            lines.current[i] = el as Line2 | null;
          }}
          points={a.points}
          color={ICE}
          lineWidth={a.weight}
          dashed
          dashSize={a.length}
          gapSize={a.length}
          dashOffset={a.length}
          transparent
          opacity={0}
          toneMapped={false}
          depthTest={false}
        />
      ))}
    </group>
  );
}
