"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type SectionContextValue = {
  sections: string[];
  visibleSections: string[];
  registerSection: (id: string) => void;
  unregisterSection: (id: string) => void;
  setVisibleSections: (ids: string[]) => void;
};

const SectionContext = createContext<SectionContextValue | null>(null);

export const useSections = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSections must be used within a SectionProvider");
  }
  return context;
};

type SectionProviderProps = {
  children: ReactNode;
};

export const SectionProvider = (props: SectionProviderProps) => {
  const [sections, setSections] = useState<string[]>([]);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  const registerSection = useCallback((id: string) => {
    setSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const unregisterSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s !== id));
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.id);
        if (visible.length > 0) {
          setVisibleSections(visible);
        }
      },
      { rootMargin: "-100px 0px -66% 0px" }
    );

    const elements = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections]);

  const value: SectionContextValue = {
    sections,
    visibleSections,
    registerSection,
    unregisterSection,
    setVisibleSections,
  };

  return (
    <SectionContext.Provider value={value}>
      {props.children}
    </SectionContext.Provider>
  );
};
