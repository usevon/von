"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useVelocity,
} from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TextHoverEffectProps = {
  text: string;
  className?: string;
  /**
   * Width of the shine beam as a fraction of the container width (0-1).
   * @default 0.5
   */
  beamWidth?: number;
  /**
   * Edge softness of the beam (0 = hard edge, 1 = fully feathered).
   * @default 0.7
   */
  beamSoftness?: number;
  /**
   * Duration of one full sweep in seconds.
   * @default 5.5
   */
  sweepDuration?: number;
  /**
   * Pause in seconds at each end before reversing.
   * @default 1.2
   */
  sweepPause?: number;
};

export const TextHoverEffect = ({
  text,
  className,
  beamWidth = 0.5,
  beamSoftness = 0.7,
  sweepDuration = 5.5,
  sweepPause = 1.2,
}: TextHoverEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const autoControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const enterControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const exitControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const settledRef = useRef(false);
  // Track last mouse direction: 1 = moving right, -1 = moving left
  const lastDirectionRef = useRef<1 | -1>(1);
  const lastMouseXRef = useRef(0);

  // beamX: fraction representing beam center position
  const beamX = useMotionValue(0);
  // Track velocity for momentum-aware transitions
  const beamVelocity = useVelocity(beamX);

  const halfBeam = beamWidth / 2;
  const feather = beamSoftness * halfBeam;

  // Sweep past edges so beam fully exits on both sides
  const sweepStart = -halfBeam - feather;
  const sweepEnd = 1 + halfBeam + feather;
  const totalRange = sweepEnd - sweepStart;

  // Soft-edged beam mask via CSS gradient on the grid-stacked span.
  const maskImage = useTransform(beamX, (x) => {
    const center = x * 100;
    const left = center - halfBeam * 100;
    const innerLeft = left + feather * 100;
    const innerRight = center + (halfBeam - feather) * 100;
    const right = center + halfBeam * 100;

    return `linear-gradient(to right, transparent ${left}%, black ${innerLeft}%, black ${innerRight}%, transparent ${right}%)`;
  });

  // Convert mouse clientX to 0..1 fraction of container width
  const mouseToFraction = useCallback((clientX: number): number => {
    const el = containerRef.current;
    if (!el) return 0.5;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // Helper: start the infinite mirror sweep from a given edge
  const startLoop = useCallback(
    (fromEdge: number) => {
      const toEdge = fromEdge === sweepStart ? sweepEnd : sweepStart;
      autoControlsRef.current = animate(beamX, [fromEdge, toEdge], {
        duration: sweepDuration,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "mirror",
        repeatDelay: sweepPause,
      });
    },
    [beamX, sweepStart, sweepEnd, sweepDuration, sweepPause],
  );

  // Auto-sweep on mount
  useEffect(() => {
    if (!hoveredRef.current) {
      startLoop(sweepStart);
    }
    return () => {
      autoControlsRef.current?.stop();
    };
  }, [sweepStart, startLoop]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      hoveredRef.current = true;
      settledRef.current = false;

      // Stop any running animations
      autoControlsRef.current?.stop();
      autoControlsRef.current = null;
      exitControlsRef.current?.stop();
      exitControlsRef.current = null;

      lastMouseXRef.current = e.clientX;

      const target = mouseToFraction(e.clientX);

      // Use current beamX velocity so the spring picks up the sweep's momentum
      const currentVelocity = beamVelocity.get();

      enterControlsRef.current = animate(beamX, target, {
        type: "spring",
        stiffness: 200,
        damping: 25,
        velocity: currentVelocity,
        onComplete: () => {
          settledRef.current = true;
          enterControlsRef.current = null;
        },
      });
    },
    [beamX, beamVelocity, mouseToFraction],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Track direction
      if (e.clientX > lastMouseXRef.current) lastDirectionRef.current = 1;
      else if (e.clientX < lastMouseXRef.current)
        lastDirectionRef.current = -1;
      lastMouseXRef.current = e.clientX;

      const target = mouseToFraction(e.clientX);

      if (!settledRef.current && enterControlsRef.current) {
        enterControlsRef.current.stop();
        enterControlsRef.current = animate(beamX, target, {
          type: "spring",
          stiffness: 200,
          damping: 25,
          onComplete: () => {
            settledRef.current = true;
            enterControlsRef.current = null;
          },
        });
      } else {
        beamX.set(target);
      }
    },
    [beamX, mouseToFraction],
  );

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = false;
    enterControlsRef.current?.stop();
    enterControlsRef.current = null;
    settledRef.current = false;

    const current = beamX.get();
    const movingRight = lastDirectionRef.current === 1;

    // Phase 1: carry the beam to the nearest edge in the mouse's last direction.
    // Duration is proportional to remaining distance so speed matches the normal sweep.
    const nearEdge = movingRight ? sweepEnd : sweepStart;
    const remainingDistance = Math.abs(nearEdge - current);
    const proportionalDuration = (remainingDistance / totalRange) * sweepDuration;

    // Clamp to a reasonable minimum so very short distances don't pop
    const exitDuration = Math.max(0.15, proportionalDuration);

    exitControlsRef.current = animate(beamX, nearEdge, {
      duration: exitDuration,
      ease: "easeOut",
      onComplete: () => {
        exitControlsRef.current = null;
        // Phase 2: start the infinite mirror loop from this edge
        if (!hoveredRef.current) {
          startLoop(nearEdge);
        }
      },
    });
  }, [beamX, sweepStart, sweepEnd, totalRange, sweepDuration, startLoop]);

  const textClass =
    "select-none text-center font-bold uppercase whitespace-nowrap leading-none";

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      aria-hidden="true"
      role="presentation"
    >
      {/*
        Grid stacking: both spans occupy the same grid cell (row 1, col 1).
        Both are in normal flow with identical layout — guaranteed alignment.
      */}
      <div className="grid -translate-y-[5%] [&>*]:[grid-area:1/1]">
        {/* Base layer: outline text */}
        <span
          className={cn(textClass, "text-transparent")}
          style={{
            fontSize: "1em",
            WebkitTextStroke: "0.012em color-mix(in srgb, var(--color-foreground) 15%, transparent)",
          }}
        >
          {text}
        </span>

        {/* Beam layer: gradient text with soft-edged mask */}
        <motion.span
          className={cn(textClass)}
          style={{
            fontSize: "1em",
            background:
              "linear-gradient(to bottom, var(--wallpaper-1), var(--wallpaper-2), var(--wallpaper-3), var(--wallpaper-4), var(--wallpaper-5))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextStroke: "0.015em transparent",
            WebkitMaskImage: maskImage,
            maskImage: maskImage,
          }}
        >
          {text}
        </motion.span>
      </div>
    </div>
  );
};
