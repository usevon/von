"use client";

import { cn } from "@usevon/ui";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import { useRef, useState } from "react";

type TextHoverEffectProps = {
  text: string;
  className?: string;
};

export const TextHoverEffect = ({ text, className }: TextHoverEffectProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState(false);

  const cx = useMotionValue("50%");
  const cy = useMotionValue("50%");
  const r = useSpring(0, { stiffness: 300, damping: 50 });

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    cx.set(`${((e.clientX - rect.left) / rect.width) * 100}%`);
    cy.set(`${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  function handleMouseEnter(e: React.MouseEvent<SVGSVGElement>) {
    handleMouseMove(e);
    r.set(20);
    setHovered(true);
  }

  function handleMouseLeave() {
    r.set(0);
    setHovered(false);
  }

  const rPercent = useMotionTemplate`${r}%`;

  return (
    <svg
      className={cn("select-none", className)}
      height="100%"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={svgRef}
      viewBox="0 0 200 40"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="textGradient"
          x1="0%"
          x2="0%"
          y1="0%"
          y2="100%"
        >
          <stop
            className="[stop-color:hsl(220,60%,18%)] dark:[stop-color:hsl(215,20%,12%)]"
            offset="0%"
          />
          <stop
            className="[stop-color:hsl(210,55%,28%)] dark:[stop-color:hsl(215,18%,18%)]"
            offset="50%"
          />
          <stop
            className="[stop-color:hsl(200,45%,45%)] dark:[stop-color:hsl(210,15%,28%)]"
            offset="70%"
          />
          <stop
            className="[stop-color:hsl(205,50%,55%)] dark:[stop-color:hsl(210,12%,38%)]"
            offset="85%"
          />
          <stop
            className="[stop-color:hsl(210,55%,60%)] dark:[stop-color:hsl(210,10%,50%)]"
            offset="100%"
          />
        </linearGradient>

        <motion.radialGradient
          cx={cx}
          cy={cy}
          gradientUnits="userSpaceOnUse"
          id="revealMask"
          r={rPercent}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>

        <mask id="textMask">
          <rect
            fill="url(#revealMask)"
            height="100%"
            width="100%"
            x="0"
            y="0"
          />
        </mask>
      </defs>

      {/* Base outline text */}
      <text
        className="fill-transparent stroke-foreground/20 font-bold font-sans"
        dominantBaseline="middle"
        fontSize="48"
        strokeWidth="0.4"
        textAnchor="middle"
        x="50%"
        y="50%"
      >
        {text}
      </text>

      {/* Gradient text revealed by mask */}
      <text
        className="font-bold font-sans"
        dominantBaseline="middle"
        fill="url(#textGradient)"
        fontSize="48"
        mask="url(#textMask)"
        textAnchor="middle"
        x="50%"
        y="50%"
      >
        {text}
      </text>
    </svg>
  );
};
