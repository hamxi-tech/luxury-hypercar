"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_CONFIG,
  getConfig,
  INTERIORS,
  PAINTS,
  setConfig,
  subscribeConfig,
  WHEELS,
} from "@/lib/store";

/*
  The configurator. Three decisions, each one a row, each row a set of
  toggle buttons. The state lives in the store so the scene reads it directly;
  React only draws the panel.
*/
export function StudioPanel() {
  const config = useSyncExternalStore(subscribeConfig, getConfig, () => DEFAULT_CONFIG);
  const paint = PAINTS[config.paint];
  const wheel = WHEELS[config.wheel];
  const interior = INTERIORS[config.interior];

  return (
    <div className="absolute inset-x-0 bottom-0 px-5 pb-6 md:inset-x-auto md:right-10 md:top-1/2 md:w-[22rem] md:-translate-y-1/2 md:px-0 md:pb-0">
      <div className="scrim-bottom pointer-events-none absolute inset-x-0 -top-24 bottom-0 md:hidden" aria-hidden="true" />
      <div className="relative grid gap-6 md:gap-8">
        <Row label="Paint" value={paint.name}>
          {PAINTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="swatch"
              aria-pressed={i === config.paint}
              aria-label={p.name}
              onClick={() => setConfig({ paint: i })}
            >
              <span style={{ background: p.swatch }} />
            </button>
          ))}
        </Row>

        <Row label="Wheels" value={wheel.description}>
          {WHEELS.map((w, i) => (
            <button
              key={w.id}
              type="button"
              className="btn btn-ghost h-11 px-4 text-[11px]"
              aria-pressed={i === config.wheel}
              style={i === config.wheel ? { borderColor: "var(--ivory)", background: "rgba(236,234,228,0.06)" } : undefined}
              onClick={() => setConfig({ wheel: i })}
            >
              {w.name}
            </button>
          ))}
        </Row>

        <Row label="Interior" value={interior.description}>
          {INTERIORS.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className="swatch"
              aria-pressed={i === config.interior}
              aria-label={it.name}
              onClick={() => setConfig({ interior: i })}
            >
              <span
                style={{
                  background: `linear-gradient(135deg, ${it.leather} 0%, ${it.leather} 62%, ${it.stitch} 62%, ${it.stitch} 68%, ${it.trim} 68%)`,
                }}
              />
            </button>
          ))}
        </Row>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] text-ivory-faint">{label}</span>
        <span className="text-[13px] text-ivory">{value}</span>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
