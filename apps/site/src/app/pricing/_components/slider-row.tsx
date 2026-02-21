"use client";

import { InputPrimitive, Slider } from "@usevon/ui";
import type * as React from "react";
import { type ReactNode, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function roundToStep(v: number, step: number, min: number, max: number) {
  return Math.min(
    max,
    Math.max(min, Math.round((v - min) / step) * step + min)
  );
}

export function snapToStops(v: number, stops: readonly number[]) {
  return stops.reduce(
    (c, s) => (Math.abs(s - v) < Math.abs(c - v) ? s : c),
    stops[0] ?? v
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SliderOptions = {
  min: number;
  max: number;
  step: number;
  ticks: number[];
  labelForTick: (t: number) => string;
  tickSkipInterval?: number;
  snapStops?: readonly number[];
};

// ---------------------------------------------------------------------------
// TickScale
// ---------------------------------------------------------------------------

function TickScale({
  ticks,
  labelFor,
  skipInterval = 2,
}: {
  ticks: number[];
  labelFor: (t: number, i: number) => string;
  skipInterval?: number;
}) {
  return (
    <div className="mt-2 flex w-full items-start justify-between px-2 font-medium text-muted-foreground text-xs">
      {ticks.map((tick, i) => (
        <span
          className="flex w-0 shrink-0 flex-col items-center gap-2"
          key={tick}
        >
          <span
            className={cn(
              "h-1 w-px bg-muted-foreground/40",
              i % skipInterval !== 0 && "h-0.5"
            )}
          />
          <span
            className={cn(
              "whitespace-nowrap",
              i % skipInterval !== 0 && "opacity-0"
            )}
          >
            {labelFor(tick, i)}
          </span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NumberInput
// ---------------------------------------------------------------------------

function NumberInput({
  ariaLabel,
  min,
  max,
  step,
  suffix,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  value: number;
  onValueChange: (n: number) => void;
}) {
  const [raw, setRaw] = useState(`${value}`);

  useEffect(() => {
    setRaw(`${value}`);
  }, [value]);

  function commit() {
    const n = Number(raw);
    onValueChange(Number.isFinite(n) ? roundToStep(n, step, min, max) : min);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center border border-border bg-background focus-within:ring-[3px] focus-within:ring-ring/24">
        <InputPrimitive
          aria-label={ariaLabel}
          className="w-20 bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none"
          inputMode="numeric"
          onBlur={commit}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setRaw(e.target.value.replace(/[^\d]/g, ""));
          }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
            e.currentTarget.select()
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && commit()
          }
          type="text"
          value={raw}
        />
      </div>
      <span className="text-muted-foreground text-sm">{suffix}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SliderRow
// ---------------------------------------------------------------------------

export function SliderRow({
  title,
  inputSuffix,
  options,
  value,
  onValueChange,
  hint,
  valueText,
  valueTextClassName,
}: {
  title: string;
  inputSuffix: string;
  options: SliderOptions;
  value: number;
  onValueChange: (n: number) => void;
  hint?: string;
  valueText?: ReactNode;
  valueTextClassName?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="font-medium text-sm">{title}</p>
        <NumberInput
          ariaLabel={title}
          max={options.max}
          min={options.min}
          onValueChange={onValueChange}
          step={options.step}
          suffix={inputSuffix}
          value={value}
        />
      </div>
      <Slider
        aria-label={title}
        max={options.max}
        min={options.min}
        onValueChange={(next) => {
          const raw = Array.isArray(next) ? (next[0] ?? options.min) : next;
          const stepped = roundToStep(
            raw,
            options.step,
            options.min,
            options.max
          );
          onValueChange(
            options.snapStops
              ? snapToStops(stepped, options.snapStops)
              : stepped
          );
        }}
        step={options.step}
        value={[value]}
      />
      <TickScale
        labelFor={(t, _i) => options.labelForTick(t)}
        skipInterval={options.tickSkipInterval}
        ticks={options.ticks}
      />
      {!!valueText && (
        <p
          className={cn(
            "mt-4 text-sm",
            valueTextClassName ?? "font-medium text-foreground"
          )}
        >
          {valueText}
        </p>
      )}
      {!!hint && <p className="mt-1 text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
