import { useContext } from "react";
import { TaskListContext, useTopTasks } from "../contexts/TaskListContext";
import { TimerContext } from "../contexts/TimerContext";
import { useTauriCommand } from "../hooks/useTauriCommand";
import { SessionState, Task } from "../lib/types";

export function TaskBoard() {
  const { tasks, dispatch: taskDispatch } = useContext(TaskListContext);
  const { activeTaskId, dispatch: timerDispatch } = useContext(TimerContext);
  const { call } = useTauriCommand();

  const topTasks = useTopTasks(tasks);

  async function handleTaskClick(task: Task) {
    const session = await call<SessionState>("start_task", { taskId: task.id });
    timerDispatch({
      type: "START",
      taskId: task.id,
      startedAt: new Date(session.startedAt!),
    });
    taskDispatch({
      type: "UPDATE_LAST_USED",
      taskId: task.id,
      lastUsedAt: new Date().toISOString(),
    });
    call("set_tray_state", { state: "active" }).catch(() => {});
  }

  return (
    <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-700">
      {topTasks.map((task) => (
        <button
          key={task.id}
          onClick={() => handleTaskClick(task)}
          className={`px-3 py-2 rounded text-sm text-left truncate transition-colors ${
            task.id === activeTaskId
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          }`}
          title={task.name}
        >
          {task.name}
        </button>
      ))}
      {topTasks.length === 0 && (
        <div className="col-span-2 text-center text-gray-500 text-sm py-4">
          No tasks yet. Add one below.
        </div>
      )}
    </div>
  );
}
