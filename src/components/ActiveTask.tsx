import { useContext } from "react";
import { TaskListContext } from "../contexts/TaskListContext";
import { TimerContext } from "../contexts/TimerContext";
import { formatElapsed, useTimer } from "../hooks/useTimer";

export function ActiveTask() {
  const { activeTaskId, isPaused } = useContext(TimerContext);
  const { tasks } = useContext(TaskListContext);
  const elapsed = useTimer();

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  if (!activeTaskId || !activeTask) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 border-b border-gray-700">
        No active task
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-3 border-b border-gray-700 flex items-center justify-between ${
        isPaused ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-red-400 shrink-0">{isPaused ? "⏸" : "🔴"}</span>
        <span className="text-white font-medium truncate">{activeTask.name}</span>
      </div>
      <span className="text-gray-300 text-sm font-mono shrink-0 ml-2">
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
