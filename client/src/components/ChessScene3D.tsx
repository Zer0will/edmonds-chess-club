/**
 * Scroll-driven 3D chess piece atmosphere.
 *
 * Mounts a fixed full-viewport canvas behind the page content.
 * Capability detection routes to:
 *   - "full" → Three.js scene (lazy-loaded after first paint)
 *   - "lite" → CSS parallax of SVG silhouettes
 *   - "none" → static SVG positions (respects prefers-reduced-motion)
 *
 * Exposes a global `window.__chessScene.triggerCapture(color)` API so the
 * Play page can fire the 3D tumble effect when a real piece is captured.
 */
import { useEffect, useRef, useState } from "react";
import { detectRenderTier, isTouchDevice, type RenderTier } from "@/lib/three/capability";
import type { SceneManager } from "@/lib/three/scene-manager";

declare global {
  interface Window {
    __chessScene?: {
      triggerCapture: (color: "white" | "black") => void;
    };
  }
}

export default function ChessScene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [tier, setTier] = useState<RenderTier | null>(null);

  // Capability detection runs after mount, never during SSR
  useEffect(() => {
    setTier(detectRenderTier());
  }, []);

  // Lazy-load Three.js scene only on "full" tier
  useEffect(() => {
    if (tier !== "full") return;
    let mounted = true;

    // Wait one frame so above-the-fold paint finishes first
    const start = () => {
      if (!mounted || !canvasRef.current || !containerRef.current) return;
      import("@/lib/three/scene-manager").then(({ SceneManager }) => {
        if (!mounted || !canvasRef.current || !containerRef.current) return;
        const mgr = new SceneManager({
          canvas: canvasRef.current,
          container: containerRef.current,
          totalScrollHeight: () => document.documentElement.scrollHeight - window.innerHeight,
        });
        managerRef.current = mgr;

        // If FPS drops below 30 sustained, gracefully degrade to lite tier
        mgr.setDegradeCallback(() => {
          console.warn("[ChessScene3D] Low FPS detected, falling back to lite tier");
          mgr.dispose();
          managerRef.current = null;
          if (mounted) setTier("lite");
        });

        mgr.start();

        // Wire scroll progress
        const onScroll = () => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const p = max > 0 ? window.scrollY / max : 0;
          mgr.setScrollProgress(p);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        // Wire cursor (desktop only)
        let onPointer: ((e: PointerEvent) => void) | null = null;
        if (!isTouchDevice()) {
          onPointer = (e: PointerEvent) => {
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = -((e.clientY / window.innerHeight) * 2 - 1);
            mgr.setCursor(nx, ny);
          };
          window.addEventListener("pointermove", onPointer, { passive: true });
        }

        // Expose capture hook
        window.__chessScene = {
          triggerCapture: (color) => mgr.triggerCapture(color),
        };

        // Cleanup capture wiring on unmount
        (mgr as unknown as { _cleanupExtra?: () => void })._cleanupExtra = () => {
          window.removeEventListener("scroll", onScroll);
          if (onPointer) window.removeEventListener("pointermove", onPointer);
          delete window.__chessScene;
        };
      });
    };

    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(start);
    } else {
      setTimeout(start, 100);
    }

    return () => {
      mounted = false;
      const mgr = managerRef.current as
        | (SceneManager & { _cleanupExtra?: () => void })
        | null;
      mgr?._cleanupExtra?.();
      mgr?.dispose();
      managerRef.current = null;
    };
  }, [tier]);

  // CSS "lite" tier: scroll-driven CSS parallax with SVG pieces
  useEffect(() => {
    if (tier !== "lite") return;
    const elements = document.querySelectorAll<HTMLElement>(".chess-scene-lite-piece");
    const onScroll = () => {
      const y = window.scrollY;
      elements.forEach((el) => {
        const depth = parseFloat(el.dataset.depth ?? "0.5");
        const speed = 1 - depth * 0.7;
        const rot = parseFloat(el.dataset.rot ?? "0");
        el.style.transform = `translate3d(0, ${-y * speed * 0.4}px, 0) rotate(${rot + y * 0.02}deg)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [tier]);

  if (tier === null || tier === "none") {
    // SSR/static: render nothing (or static silhouettes for the "none" path if we want; keeping it clean)
    return null;
  }

  if (tier === "lite") {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ contain: "strict" }}
      >
        <LitePieces />
      </div>
    );
  }

  // "full" tier — Three.js canvas
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: "strict" }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

// ---------- CSS lite fallback ----------
const litePositions = [
  { x: "8%", y: "10%", depth: 0.0, rot: -8, glyph: "♞", color: "#d6cdb8" },
  { x: "85%", y: "20%", depth: 0.2, rot: 12, glyph: "♛", color: "#1b1730" },
  { x: "70%", y: "55%", depth: 0.5, rot: -4, glyph: "♝", color: "#d6cdb8" },
  { x: "15%", y: "70%", depth: 0.7, rot: 6, glyph: "♟", color: "#1b1730" },
  { x: "20%", y: "120%", depth: 0.1, rot: 10, glyph: "♚", color: "#1b1730" },
  { x: "80%", y: "150%", depth: 0.4, rot: -10, glyph: "♜", color: "#d6cdb8" },
  { x: "55%", y: "180%", depth: 0.6, rot: 4, glyph: "♞", color: "#1b1730" },
  { x: "10%", y: "210%", depth: 0.8, rot: -2, glyph: "♟", color: "#d6cdb8" },
];

function LitePieces() {
  return (
    <>
      {litePositions.map((p, i) => (
        <div
          key={i}
          className="chess-scene-lite-piece absolute font-serif select-none"
          data-depth={p.depth}
          data-rot={p.rot}
          style={{
            left: p.x,
            top: p.y,
            fontSize: `${110 * (1 - p.depth * 0.5)}px`,
            color: p.color,
            opacity: 0.18 + (1 - p.depth) * 0.18,
            textShadow: "0 6px 32px rgba(74, 47, 115, 0.5)",
            willChange: "transform",
            transform: "translate3d(0,0,0)",
          }}
        >
          {p.glyph}
        </div>
      ))}
    </>
  );
}
