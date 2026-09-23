"use client";
"use no memo";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { LightRig, stateAt } from "./LightRig";
import { Vehicle } from "./Vehicle";
import { Speed } from "./Speed";
import { Intelligence } from "./Intelligence";
import { targets } from "./director";
import { live, step } from "./live";
import { frame, setChapter, subscribeFrame } from "@/lib/store";
import { budget as readBudget } from "@/lib/device";
import { flags } from "@/lib/debug";

/*
  One canvas for the whole page. The page scrolls over it, chapters write
  their progress into the store, and the director turns that into camera and
  scene state. The render loop is on demand: a frame is drawn only while a
  value is still easing toward its target or the visitor is doing something.
*/

const pointer = { x: 0, y: 0 };
const debug = { calls: 0, early: 0, steps: 0, lastDt: 0 };

function Director({
  maxFps,
  pointerLighting,
  adaptive,
  baseDpr,
}: {
  maxFps: number;
  pointerLighting: boolean;
  adaptive: boolean;
  baseDpr: number;
}) {
  const { camera, invalidate: inv, size, setDpr } = useThree();
  const lastDraw = useRef(0);
  const frameCost = useRef(16);
  const scale = useRef(1);
  const settledAt = useRef(0);
  const spacing = 1000 / maxFps;
  const up = new THREE.Vector3(0, 1, 0);
  const offset = useRef(new THREE.Vector3());

  // Any store change requests a frame; the frame requests the next one itself
  // while anything is still moving.
  useEffect(() => subscribeFrame(() => inv()), [inv]);

  useFrame(() => {
    const now = performance.now();
    debug.calls++;
    if (now - lastDraw.current < spacing * 0.85) {
      debug.early++;
      // Too soon for this tier's frame budget; try again next tick.
      inv();
      return;
    }
    // The delta is measured here rather than taken from the loop: in demand
    // mode the loop's clock stops between frames and reports zero.
    const dt = lastDraw.current ? (now - lastDraw.current) / 1000 : 1 / 60;
    lastDraw.current = now;
    debug.steps++;
    debug.lastDt = dt;

    const t = targets(frame.chapter, frame.progress);

    // The shot list is composed for a landscape frame. A portrait phone keeps
    // the same composition by standing further back for exterior shots and by
    // opening the lens for shots inside the car, where there is no room to step back.
    const aspect = size.width / Math.max(1, size.height);
    const portrait = Math.min(1, Math.max(0, (1.5 - aspect) / 0.9));
    if (portrait > 0) {
      const dx = t.pos[0] - t.look[0];
      const dy = t.pos[1] - t.look[1];
      const dz = t.pos[2] - t.look[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 2.4) {
        const k = 1 + portrait * 0.85;
        t.pos = [t.look[0] + dx * k, t.look[1] + dy * k, t.look[2] + dz * k];
      } else {
        t.fov = Math.min(82, t.fov * (1 + portrait * 0.3));
      }
    }

    const moving = step(t, dt, pointerLighting ? pointer : { x: 0, y: 0 });

    const cam = camera as THREE.PerspectiveCamera;
    // A slight sideways drift from the pointer: the visitor leans, the camera
    // leans with them. Never in the cockpit, where it would feel like a head bob.
    const parallax = pointerLighting ? 0.18 * (1 - live.door) * Math.min(1, live.pos.distanceTo(live.look) / 3) : 0;
    offset.current.copy(live.pos).sub(live.look).normalize().cross(up).multiplyScalar(live.px * parallax);
    offset.current.y += live.py * parallax * 0.5;
    cam.position.copy(live.pos).add(offset.current);
    cam.lookAt(live.look);
    if (Math.abs(cam.fov - live.fov) > 0.01) {
      cam.fov = live.fov;
      cam.updateProjectionMatrix();
    }

    /*
      Adaptive resolution. While the camera is moving, frames that run long
      lower the render scale a step at a time; once the scene has settled for
      a moment the full resolution returns. Runs after the step so it sees the
      frame that settles, and keeps the loop alive until it has restored. The visitor sees motion at a
      slightly softer resolution and every still frame at full quality.
    */
    if (adaptive) {
      const ms = Math.min(dt * 1000, 100);
      frameCost.current += (ms - frameCost.current) * 0.15;
      if (moving) {
        settledAt.current = 0;
        // Large viewports may step lower: at 1920 wide a 0.7 scale is still 1344 px.
        const floor = size.width >= 1800 ? 0.7 : 0.75;
        if (frameCost.current > 22 && scale.current > floor) {
          scale.current = Math.max(floor, scale.current - 0.125);
          frameCost.current = 16;
          setDpr(baseDpr * scale.current);
        }
      } else if (scale.current < 1) {
        if (!settledAt.current) settledAt.current = now;
        if (now - settledAt.current > 250) {
          scale.current = 1;
          setDpr(baseDpr);
        }
        inv();
      }
    }

    if (moving) inv();
  }, -1);

  return null;
}

/* Development only: exposes the loop state so idle behaviour can be measured
   from the browser console (the page must draw zero frames when nothing moves). */
function DevProbe() {
  const state = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __aubade?: unknown }).__aubade = { live, frame, state, targets, debug, setChapter };
  }, [state]);
  return null;
}

function Floor({ reflective, contact }: { reflective: boolean; contact: boolean }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const shadow = useRef<THREE.Group>(null);
  const floor = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = stateAt(live.daylight, live.rig);
    material.current?.color.setRGB(...s.floor);
    if (floor.current) floor.current.visible = !flags.noReflector;
    if (shadow.current) shadow.current.visible = !flags.noContact;
  });
  return (
    <group>
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        {reflective ? (
          <MeshReflectorMaterial
            ref={material as never}
            resolution={512}
            blur={[300, 100]}
            mixBlur={1}
            mixStrength={1.0}
            mixContrast={1}
            depthScale={0.9}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.6}
            roughness={0.85}
            metalness={0.1}
            mirror={0.25}
            color="#0c0e12"
          />
        ) : (
          <meshStandardMaterial ref={material} color="#0c0e12" roughness={0.55} metalness={0.15} envMapIntensity={0.7} />
        )}
      </mesh>
      <group ref={shadow} visible={contact}>
        <ContactShadows
          position={[0, 0.002, 0.25]}
          scale={[7, 7]}
          blur={2.2}
          opacity={0.75}
          far={1.2}
          resolution={512}
          frames={contact ? Infinity : 1}
          color="#04050a"
        />
      </group>
    </group>
  );
}

function Pointer({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      invalidate();
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [enabled]);
  return null;
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const [budget] = useState(readBudget);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);

  return (
    <Canvas
      frameloop="demand"
      dpr={budget.dpr}
      shadows={budget.shadowMapSize > 0 ? { type: THREE.PCFShadowMap } : false}
      gl={{
        antialias: budget.antialias,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{ fov: 30, near: 0.05, far: 80, position: [3.6, 0.5, 8.2] }}
      style={{ position: "absolute", inset: 0 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <Director
        maxFps={budget.maxFps}
        pointerLighting={budget.pointerLighting}
        adaptive={budget.adaptiveResolution}
        baseDpr={Math.min(budget.dpr[1], typeof window === "undefined" ? 1 : window.devicePixelRatio)}
      />
      <DevProbe />
      <Pointer enabled={budget.pointerLighting} />
      <LightRig shadowMapSize={budget.shadowMapSize} />
      <Suspense fallback={null}>
        <Vehicle model={budget.model} transmission={budget.transmission} onReady={() => setReady(true)} />
        <Intelligence />
      </Suspense>
      <Speed />
      <Floor reflective={budget.floorReflection} contact={budget.contactShadow} />
    </Canvas>
  );
}
