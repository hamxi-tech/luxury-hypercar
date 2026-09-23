"use client";

import { useEffect, useRef } from "react";
import { invalidate } from "@react-three/fiber";
import { live } from "@/components/scene/live";

/*
  Drag anywhere on the studio stage to turn the car. The horizontal axis is
  ours; a vertical swipe still scrolls the page (touch-action: pan-y). The yaw
  lives in the scene's live state and is read in the render loop.
*/
export function StudioDrag() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastT = performance.now();
      live.yawVelocity = 0;
      node.setPointerCapture(e.pointerId);
      node.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max(1, now - lastT) / 1000;
      const delta = (dx / node.clientWidth) * Math.PI * 1.4;
      live.yaw += delta;
      live.yawVelocity = delta / dt;
      lastX = e.clientX;
      lastT = now;
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
      node.style.cursor = "grab";
      // Coast, but not forever.
      live.yawVelocity = Math.max(-4, Math.min(4, live.yawVelocity));
      invalidate();
    };

    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div
      ref={el}
      className="absolute inset-0"
      style={{ touchAction: "pan-y", cursor: "grab" }}
      aria-hidden="true"
    />
  );
}
