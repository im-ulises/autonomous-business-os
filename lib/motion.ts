"use client";

import { flushSync } from "react-dom";

/**
 * Preserve visual continuity when changing a workspace view or opening a detail.
 * Uses the native View Transitions API when available, with an instant fallback.
 * Animation is disabled for visitors who prefer reduced motion.
 */
type MotionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

export function smoothChange(update: () => void): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    update();
    return;
  }
  const doc = document as MotionDocument;
  const reduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
