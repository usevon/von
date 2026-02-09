"use client";

import { animate, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

type WallpaperProps = {
  children: React.ReactNode;
  className?: string;
};

type GradientColors = {
  h1: number;
  s1: string;
  l1: string;
  h2: number;
  s2: string;
  l2: string;
  h3: number;
  s3: string;
  l3: string;
  s4: string;
  l4: string;
  s5: string;
  l5: string;
};

const getColors = (): GradientColors => {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();

  return {
    h1: Number.parseFloat(get("--wallpaper-h1")) || 220,
    s1: get("--wallpaper-s1") || "60%",
    l1: get("--wallpaper-l1") || "18%",
    h2: Number.parseFloat(get("--wallpaper-h2")) || 210,
    s2: get("--wallpaper-s2") || "55%",
    l2: get("--wallpaper-l2") || "28%",
    h3: Number.parseFloat(get("--wallpaper-h3")) || 200,
    s3: get("--wallpaper-s3") || "45%",
    l3: get("--wallpaper-l3") || "45%",
    s4: get("--wallpaper-s4") || "50%",
    l4: get("--wallpaper-l4") || "55%",
    s5: get("--wallpaper-s5") || "55%",
    l5: get("--wallpaper-l5") || "60%",
  };
};

export const Wallpaper = (props: WallpaperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<GradientColors>(null);
  const hueShift = useMotionValue(0);

  const refreshColors = useCallback(() => {
    colorsRef.current = getColors();
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

    refreshColors();

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
          refreshColors();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    let animationFrame: number;

    const render = () => {
      const colors = colorsRef.current;
      if (!colors) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      const shift = hueShift.get();
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

      gradient.addColorStop(
        0,
        `hsl(${colors.h1 + shift}, ${colors.s1}, ${colors.l1})`
      );
      gradient.addColorStop(
        0.5,
        `hsl(${colors.h2 + shift * 0.8}, ${colors.s2}, ${colors.l2})`
      );
      gradient.addColorStop(
        0.7,
        `hsl(${colors.h3 + shift * 0.5}, ${colors.s3}, ${colors.l3})`
      );
      gradient.addColorStop(0.85, `hsl(205, ${colors.s4}, ${colors.l4})`);
      gradient.addColorStop(1, `hsl(210, ${colors.s5}, ${colors.l5})`);

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
  }, [hueShift, refreshColors]);

  return (
    <div
      className={`relative overflow-hidden ${props.className ?? ""}`}
      style={{
        background: `linear-gradient(to bottom,
          hsl(var(--wallpaper-h1), var(--wallpaper-s1), var(--wallpaper-l1)) 0%,
          hsl(var(--wallpaper-h2), var(--wallpaper-s2), var(--wallpaper-l2)) 50%,
          hsl(var(--wallpaper-h3), var(--wallpaper-s3), var(--wallpaper-l3)) 70%,
          hsl(205, var(--wallpaper-s4), var(--wallpaper-l4)) 85%,
          hsl(210, var(--wallpaper-s5), var(--wallpaper-l5)) 100%)`,
      }}
    >
      <canvas aria-hidden="true" className="absolute inset-0" ref={canvasRef} />
      <div className="relative z-10">{props.children}</div>
    </div>
  );
};
