"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "#design", label: "Design" },
  { href: "#performance", label: "Performance" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#interior", label: "Interior" },
  { href: "#studio", label: "Studio" },
];

/*
  The nav is a single line, 64px, and it fades out during the reveal so the
  first five seconds belong to the car alone. It returns as soon as the visitor
  scrolls, which is also the moment it becomes useful.
*/
export function Nav() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    // A passive scroll listener that only schedules a boolean check is the
    // cheapest thing that answers "has the visitor left the reveal yet".
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-5 md:px-10">
        <a href="#top" className="text-ivory" aria-label="Elström, back to top">
          <Wordmark />
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] tracking-wide text-ivory-dim transition-colors hover:text-ivory"
            >
              {l.label}
            </a>
          ))}
          <a href="#showroom" className="btn btn-ghost h-10 px-5 text-[11px]">
            Schedule private viewing
          </a>
        </nav>

        <button
          type="button"
          className="text-[13px] tracking-wide text-ivory lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line bg-graphite/95 px-5 py-6 backdrop-blur-md lg:hidden"
      >
        <nav aria-label="Sections" className="flex flex-col gap-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="display text-2xl text-ivory"
            >
              {l.label}
            </a>
          ))}
          <a href="#showroom" onClick={() => setOpen(false)} className="btn btn-ghost mt-2 w-fit">
            Schedule private viewing
          </a>
        </nav>
      </div>
    </header>
  );
}
