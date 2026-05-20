/**
 * Capability detection for the 3D experience.
 * Returns "full" (Three.js), "lite" (CSS fallback), or "none" (no animation).
 */

export type RenderTier = "full" | "lite" | "none";

interface NetworkInformation {
  effectiveType?: "2g" | "3g" | "4g" | "slow-2g";
  saveData?: boolean;
}

export function detectRenderTier(): RenderTier {
  // SSR safety
  if (typeof window === "undefined") return "lite";

  // Reduced motion → no scroll-driven animation at all
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return "none";

  // No WebGL → CSS fallback
  if (!hasWebGL()) return "lite";

  // Low core count
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores < 4) return "lite";

  // Slow connection
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "3g") {
    return "lite";
  }
  if (conn?.saveData) return "lite";

  // Low device memory
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem < 4) return "lite";

  // Small mobile viewport with coarse pointer → use lite tier
  // (touch phones are usually thermally constrained for continuous WebGL)
  const isCoarsePointer = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
  const isNarrow = window.innerWidth < 640;
  if (isCoarsePointer && isNarrow) return "lite";

  return "full";
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
}
