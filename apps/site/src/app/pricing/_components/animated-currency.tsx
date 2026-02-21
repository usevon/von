"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

import { fmtCurrency } from "@/lib/calculator";

export function AnimatedCurrency({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 300, damping: 30, mass: 0.3 });
  const display = useTransform(spring, (v) => fmtCurrency.format(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}
