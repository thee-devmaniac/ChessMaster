"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * True when the user has asked their operating system for less motion.
 * CSS animations already respect this (see globals.css); this hook is for
 * motion that JavaScript controls, like the board's piece sliding.
 *
 * useSyncExternalStore reads a value that lives outside React (here, a
 * browser setting) and re-renders when it changes.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // on the server there is no window: assume motion is fine
  );
}
