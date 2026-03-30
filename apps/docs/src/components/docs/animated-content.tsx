"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

const transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export const AnimatedContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        initial={{ opacity: 0, y: 4 }}
        key={pathname}
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
