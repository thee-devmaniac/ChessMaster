"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Extra wait before this item appears, for staggering a row of cards. */
  delayMs?: number;
}

/**
 * Fades and lifts its content into view the first time it scrolls onto the
 * screen (the showcase's scroll reveal, without GSAP). The animation itself is
 * CSS (.reveal / .revealed in globals.css); this component only watches
 * for the element entering the viewport, using IntersectionObserver.
 */
export function Reveal({ children, delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect(); // reveal once, then stop watching
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={revealed ? "reveal revealed" : "reveal"} style={{ "--delay": `${delayMs}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
