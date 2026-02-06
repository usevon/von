"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionTemplate, useSpring } from "motion/react";
import { cn } from "@usevon/ui";

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
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 200 40"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={cn("select-none", className)}
    >
      <defs>
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" className="[stop-color:hsl(220,60%,18%)] dark:[stop-color:hsl(215,20%,12%)]" />
          <stop offset="50%" className="[stop-color:hsl(210,55%,28%)] dark:[stop-color:hsl(215,18%,18%)]" />
          <stop offset="70%" className="[stop-color:hsl(200,45%,45%)] dark:[stop-color:hsl(210,15%,28%)]" />
          <stop offset="85%" className="[stop-color:hsl(205,50%,55%)] dark:[stop-color:hsl(210,12%,38%)]" />
          <stop offset="100%" className="[stop-color:hsl(210,55%,60%)] dark:[stop-color:hsl(210,10%,50%)]" />
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          cx={cx}
          cy={cy}
          r={rPercent}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>

        <mask id="textMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" />
        </mask>
      </defs>

      {/* Base outline text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.4"
        fontSize="48"
        className="fill-transparent stroke-foreground/20 font-sans font-bold"
      >
        {text}
      </text>

      {/* Gradient text revealed by mask */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="48"
        fill="url(#textGradient)"
        mask="url(#textMask)"
        className="font-sans font-bold"
      >
        {text}
      </text>
    </svg>
  );
};
