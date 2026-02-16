"use client";

import { animate, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

type WallpaperProps = {
  children: React.ReactNode;
  className?: string;
};

type GradientStop = {
  offset: number;
  h: number;
  s: number;
  l: number;
  /** Multiplier for the animated hue shift (0 = no shift) */
  hueShiftScale: number;
};

const LIGHT_STOPS: GradientStop[] = [
  { offset: 0, h: 220, s: 60, l: 18, hueShiftScale: 1 },
  { offset: 0.5, h: 210, s: 55, l: 28, hueShiftScale: 0.8 },
  { offset: 0.7, h: 200, s: 45, l: 45, hueShiftScale: 0.5 },
  { offset: 0.85, h: 205, s: 50, l: 55, hueShiftScale: 0 },
  { offset: 1, h: 210, s: 55, l: 60, hueShiftScale: 0 },
];

const DARK_STOPS: GradientStop[] = [
  { offset: 0, h: 220, s: 60, l: 32, hueShiftScale: 1 },
  { offset: 0.5, h: 210, s: 55, l: 38, hueShiftScale: 0.8 },
  { offset: 0.7, h: 200, s: 45, l: 45, hueShiftScale: 0.5 },
  { offset: 0.85, h: 205, s: 50, l: 50, hueShiftScale: 0 },
  { offset: 1, h: 210, s: 55, l: 55, hueShiftScale: 0 },
];

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

export const Wallpaper = (props: WallpaperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopsRef = useRef<GradientStop[]>(
    typeof document !== "undefined" && isDarkMode() ? DARK_STOPS : LIGHT_STOPS,
  );

  const hueShift = useMotionValue(0);

  // Animated lightness values for smooth theme transitions
  const animatedLightness = useRef(
    stopsRef.current.map((s) => ({ value: s.l })),
  );

  const refreshStops = useCallback(() => {
    const target = isDarkMode() ? DARK_STOPS : LIGHT_STOPS;
    stopsRef.current = target;

    // Animate each stop's lightness to its new value
    for (let i = 0; i < target.length; i++) {
      const ref = animatedLightness.current[i];
      animate(ref.value, target[i].l, {
        duration: 0.5,
        ease: "easeInOut",
        onUpdate: (v) => {
          ref.value = v;
        },
      });
    }
  }, []);

  useEffect(() => {
    const controls = animate(hueShift, [0, 10, -5, 0], {
      duration: 20,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    });

    return () => controls.stop();
  }, [hueShift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync initial state
    refreshStops();

    const updateCanvasSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          refreshStops();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    let animationFrame: number;

    const render = () => {
      const stops = stopsRef.current;
      const shift = hueShift.get();
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const l = animatedLightness.current[i].value;
        gradient.addColorStop(
          stop.offset,
          `hsl(${stop.h + shift * stop.hueShiftScale}, ${stop.s}%, ${l}%)`,
        );
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add grain texture
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
      }

      ctx.putImageData(imageData, 0, 0);

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [hueShift, refreshStops]);

  return (
    <div
      className={`relative overflow-hidden ${props.className ?? ""}`}
      style={{
        background: `linear-gradient(to bottom,
          var(--wallpaper-1) 0%,
          var(--wallpaper-2) 50%,
          var(--wallpaper-3) 70%,
          var(--wallpaper-4) 85%,
          var(--wallpaper-5) 100%)`,
      }}
    >
      <canvas
        aria-hidden="true"
        className="absolute inset-0"
        ref={canvasRef}
        tabIndex={-1}
      />
      <div className="relative z-10 grid h-full w-full">{props.children}</div>
    </div>
  );
};
