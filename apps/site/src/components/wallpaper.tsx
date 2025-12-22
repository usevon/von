"use client";

import { useEffect, useRef } from "react";

type WallpaperProps = {
  children: React.ReactNode;
  className?: string;
};

export const Wallpaper = (props: WallpaperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.0003;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

      // Deep blue at top
      gradient.addColorStop(0, `hsl(220, 60%, ${18 + Math.sin(time) * 2}%)`);
      gradient.addColorStop(0.5, `hsl(210, 55%, ${28 + Math.sin(time * 1.2) * 3}%)`);

      // Horizon - soft light
      gradient.addColorStop(0.7, `hsl(200, 45%, ${45 + Math.sin(time * 0.8) * 4}%)`);
      gradient.addColorStop(0.85, `hsl(205, 50%, ${55 + Math.sin(time * 0.9) * 3}%)`);
      gradient.addColorStop(1, `hsl(210, 55%, ${60 + Math.sin(time * 1.1) * 2}%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle grain texture
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
      }

      ctx.putImageData(imageData, 0, 0);

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${props.className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0 -z-10" aria-hidden="true" />
      <div className="relative">{props.children}</div>
    </div>
  );
};
