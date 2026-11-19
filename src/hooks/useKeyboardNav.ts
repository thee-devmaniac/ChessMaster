"use client";

import { useEffect, useRef } from "react";

export interface KeyboardNav {
  back?: () => void; // ←
  forward?: () => void; // →
  start?: () => void; // Home
  end?: () => void; // End
}

/**
 * Arrow keys step through moves; Home/End jump to the start/end.
 * Keys are ignored while the user is typing in a text box.
 *
 * The handlers are kept in a ref, so the listener is added once but always
 * calls the latest handlers (which change on every render).
 */
export function useKeyboardNav(nav: KeyboardNav) {
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT") return;
      const handlers: Record<string, (() => void) | undefined> = {
        ArrowLeft: navRef.current.back,
        ArrowRight: navRef.current.forward,
        Home: navRef.current.start,
        End: navRef.current.end,
      };
      const handler = handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
