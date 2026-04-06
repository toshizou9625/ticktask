import { useContext, useEffect, useRef, useState } from "react";
import { TimerContext } from "../contexts/TimerContext";

/**
 * Returns the real-time elapsed seconds for the currently active task.
 * Ticks every second when a task is running (not paused).
 */
export function useTimer(): number {
  const { activeTaskId, startedAt, isPaused, todayAccumulated } =
    useContext(TimerContext);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTaskId && startedAt && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTaskId, startedAt, isPaused]);

  if (!activeTaskId) return 0;

  const accumulated = todayAccumulated[activeTaskId] ?? 0;
  if (isPaused || !startedAt) return accumulated;

  const currentInterval = Math.floor(
    (Date.now() - startedAt.getTime()) / 1000
  );
  return accumulated + currentInterval;
}

/** Format seconds as H:MM */
export function formatElapsed(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}
