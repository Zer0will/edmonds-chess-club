/**
 * Chess Clock Hook — Edmonds Chess Club
 * Manages game timers for both players with increment support
 */
import { useState, useRef, useCallback, useEffect } from "react";
import type { Color } from "@/lib/chess-engine";

export interface ClockConfig {
  initialTime: number; // seconds
  increment: number; // seconds per move
}

export interface ClockState {
  whiteTime: number;
  blackTime: number;
  running: boolean;
  activeColor: Color | null;
}

export function useChessClock(config: ClockConfig) {
  const [state, setState] = useState<ClockState>({
    whiteTime: config.initialTime,
    blackTime: config.initialTime,
    running: false,
    activeColor: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((color: Color) => {
    setState(prev => ({ ...prev, running: true, activeColor: color }));
  }, []);

  const switchClock = useCallback((toColor: Color) => {
    setState(prev => {
      // Add increment to the player who just moved
      const fromColor = toColor === 'white' ? 'black' : 'white';
      return {
        ...prev,
        activeColor: toColor,
        [`${fromColor}Time`]: prev[`${fromColor}Time`] + config.increment,
      } as ClockState;
    });
  }, [config.increment]);

  const stop = useCallback(() => {
    setState(prev => ({ ...prev, running: false, activeColor: null }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setState({
      whiteTime: config.initialTime,
      blackTime: config.initialTime,
      running: false,
      activeColor: null,
    });
  }, [config.initialTime, stop]);

  useEffect(() => {
    if (state.running && state.activeColor) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (!prev.activeColor) return prev;
          const key = `${prev.activeColor}Time` as 'whiteTime' | 'blackTime';
          const newTime = Math.max(0, prev[key] - 1);
          if (newTime === 0) {
            return { ...prev, [key]: 0, running: false };
          }
          return { ...prev, [key]: newTime };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running, state.activeColor]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    start,
    switchClock,
    stop,
    reset,
    formatTime,
    isExpired: state.whiteTime === 0 || state.blackTime === 0,
    expiredColor: state.whiteTime === 0 ? 'white' as Color : state.blackTime === 0 ? 'black' as Color : null,
  };
}

// Preset time controls
export const TIME_CONTROLS = [
  { label: 'Bullet 1+0', time: 60, increment: 0 },
  { label: 'Bullet 2+1', time: 120, increment: 1 },
  { label: 'Blitz 3+0', time: 180, increment: 0 },
  { label: 'Blitz 5+0', time: 300, increment: 0 },
  { label: 'Rapid 10+0', time: 600, increment: 0 },
  { label: 'Rapid 15+10', time: 900, increment: 10 },
  { label: 'Classical 30+0', time: 1800, increment: 0 },
  { label: 'No Timer', time: 0, increment: 0 },
] as const;
