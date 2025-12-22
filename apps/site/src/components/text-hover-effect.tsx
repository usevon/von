"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";

type TextHoverEffectProps = {
  text: string;
};

export const TextHoverEffect = (props: TextHoverEffectProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((e.clientX - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((e.clientY - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 200 40"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className="select-none"
    >
      <defs>
        {/* Hero gradient colors */}
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          {hovered && (
            <>
              <stop offset="0%" className="[stop-color:hsl(220,60%,18%)] dark:[stop-color:hsl(215,20%,12%)]" />
              <stop offset="50%" className="[stop-color:hsl(210,55%,28%)] dark:[stop-color:hsl(215,18%,18%)]" />
              <stop offset="70%" className="[stop-color:hsl(200,45%,45%)] dark:[stop-color:hsl(210,15%,28%)]" />
              <stop offset="85%" className="[stop-color:hsl(205,50%,55%)] dark:[stop-color:hsl(210,12%,38%)]" />
              <stop offset="100%" className="[stop-color:hsl(210,55%,60%)] dark:[stop-color:hsl(210,10%,50%)]" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="15%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ type: "spring", stiffness: 300, damping: 50 }}
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
        className="fill-transparent stroke-foreground/20 font-sans font-bold"
        style={{ fontSize: "48px" }}
      >
        {props.text}
      </text>

      {/* Gradient text revealed by mask */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="url(#textGradient)"
        mask="url(#textMask)"
        className="font-sans font-bold"
        style={{ fontSize: "48px" }}
      >
        {props.text}
      </text>
    </svg>
  );
};
