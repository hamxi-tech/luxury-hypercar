"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { frame, setChapter, subscribeFrame, type Chapter as ChapterName } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

/*
  A chapter is a tall section with a sticky, viewport-height stage inside it.
  The scroll through the tall section is the chapter's timeline: the director
  reads it for the camera, and the captions read it for their reveals. CSS
  sticky does the pinning, so GSAP never has to move the DOM around and Lenis
  has nothing to fight.

  Captions declare their own window with data-at="start,end" (fractions of the
  chapter) and are faded and lifted into place inside that window only. The
  reveal order therefore matches the camera, which is the whole point.
*/

interface Props {
  name: ChapterName;
  /** Total scroll length of the chapter as a multiple of the viewport height. */
  length: number;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Keep the stage sticky but let content decide its own height (studio). */
  free?: boolean;
}

export function Chapter({ name, length, children, className = "", id, free }: Props) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const captions = Array.from(el.querySelectorAll<HTMLElement>("[data-at]"));
    const windows = captions.map((c) => {
      const [a, b] = c.dataset.at!.split(",").map(Number);
      return { el: c, a, b: b ?? a + 0.25 };
    });

    const apply = (p: number) => {
      for (const w of windows) {
        // 0 before the window, 1 inside it, 0 after; short ramps at each edge.
        const ramp = Math.min(0.06, (w.b - w.a) / 3);
        let v = 0;
        if (p >= w.a && p <= w.b) {
          v = Math.min((p - w.a) / ramp, (w.b - p) / ramp, 1);
        }
        if (reduce) v = v > 0 ? 1 : 0;
        w.el.style.opacity = String(v);
        w.el.style.transform = reduce ? "none" : `translate3d(0,${(1 - v) * 18}px,0)`;
        w.el.style.visibility = v > 0 ? "visible" : "hidden";
      }
    };

    // Chapters without captions still drive the camera; the ones with captions
    // always start hidden so a reload mid-page never shows every caption at once.
    apply(0);

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        setChapter(name, self.progress);
        if (name !== "reveal") apply(self.progress);
      },
      // Toggle callbacks fire after onUpdate on a jump (an anchor link, a
      // reload mid-page), so they must report the real progress, not 0 or 1.
      onEnter: (self) => setChapter(name, self.progress),
      onEnterBack: (self) => setChapter(name, self.progress),
    });

    // The reveal's captions follow the resolved progress (intro or scroll).
    const unsubscribe =
      name === "reveal"
        ? subscribeFrame(() => {
            if (frame.chapter === "reveal") apply(frame.progress);
          })
        : () => {};

    return () => {
      trigger.kill();
      unsubscribe();
    };
  }, [name]);

  return (
    <section
      ref={section}
      id={id}
      data-chapter={name}
      className={`relative ${className}`}
      style={{ height: free ? undefined : `${length * 100}vh` }}
    >
      <div className={free ? "relative" : "sticky top-0 h-[100dvh] overflow-hidden"}>{children}</div>
    </section>
  );
}
