"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setChapter } from "@/lib/store";

/*
  Everything below the showroom is ordinary page. When it reaches the top of
  the viewport the scene goes dark and stops drawing; scrolling back up brings
  the showroom's last frame straight back.
*/
export function Offstage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 40%",
      onEnter: () => setChapter("off", 0),
      onLeaveBack: () => setChapter("showroom", 1),
    });
    return () => trigger.kill();
  }, []);
  return (
    <div ref={ref} className="relative bg-graphite">
      {children}
    </div>
  );
}
