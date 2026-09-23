"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { hasWebGL, isBot, prefersReducedMotion } from "@/lib/device";
import { subscribeFrame, frame, setIntro } from "@/lib/store";
import { live } from "./live";

/*
  The three.js chunk is a separate client leaf, loaded with ssr:false, which in
  Next 16 is only allowed inside a Client Component. It is never sent to
  crawlers or to devices without WebGL: they get the poster, a still frame of
  the reveal, and the page reads exactly the same.

  The loading screen is part of the experience rather than a spinner: the
  wordmark's two points of light, waiting, and then the hall.
*/
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function SceneMount() {
  // Decided once on the client; the server always renders the pending state.
  const mode = useSyncExternalStore(
    () => () => {},
    () => (isBot() || !hasWebGL() ? "poster" : "scene"),
    () => "pending" as const,
  );
  const [ready, setReady] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // The canvas is hidden entirely under the case study and footer so nothing
  // is drawn for a viewport that cannot see it.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const off = frame.chapter === "off";
      el.style.opacity = off ? "0" : "1";
      el.style.visibility = off ? "hidden" : "visible";
    };
    const unsub = subscribeFrame(() => {
      if (!raf) raf = requestAnimationFrame(apply);
    });
    apply();
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const onReady = useCallback(() => {
    // Give the first environment bake a frame before the curtain lifts.
    requestAnimationFrame(() => setReady(true));
    live.moving = true;
  }, []);

  // The reveal plays itself once the curtain is up (or at once for the poster).
  useEffect(() => {
    if (!(ready || mode === "poster")) return;
    if (prefersReducedMotion()) {
      setIntro(1);
      return;
    }
    const state = { v: 0 };
    const tween = gsap.to(state, {
      v: 1,
      duration: 6.5,
      delay: 0.4,
      ease: "power2.inOut",
      onUpdate: () => setIntro(state.v),
    });
    return () => {
      tween.kill();
    };
  }, [ready, mode]);

  const reduced = typeof window !== "undefined" && prefersReducedMotion();

  return (
    <div
      ref={wrapper}
      className="fixed inset-0 z-0 transition-opacity duration-500"
      aria-hidden="true"
      style={{ touchAction: "pan-y" }}
    >
      {mode === "poster" && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/poster.webp)" }}
        />
      )}
      {mode === "scene" && <Scene onReady={onReady} />}

      <div
        className={`absolute inset-0 flex items-center justify-center bg-graphite transition-opacity ${
          reduced ? "duration-100" : "duration-[1400ms]"
        } ${ready || mode === "poster" ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <div className="flex gap-3" role="status" aria-label="Loading the experience">
          <span className="loader-dot size-1.5 rounded-full bg-ice" />
          <span className="loader-dot size-1.5 rounded-full bg-ice" style={{ animationDelay: "0.6s" }} />
        </div>
      </div>
    </div>
  );
}
