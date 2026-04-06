import { useContext, useState } from "react";
import { TaskListContext } from "../contexts/TaskListContext";
import { TimerContext } from "../contexts/TimerContext";
import { useTauriCommand } from "../hooks/useTauriCommand";
import { SessionState, Task } from "../lib/types";

export function TaskInput() {
  const [value, setValue] = useState("");
  const { tasks, dispatch: taskDispatch } = useContext(TaskListContext);
  const { dispatch: timerDispatch } = useContext(TimerContext);
  const { call } = useTauriCommand();

  const searchResults =
    value.trim().length > 0
      ? tasks.filter((t) => t.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
      : [];

  async function startTask(task: Task) {
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
    setValue("");
  }

  async function handleAdd() {
    const name = value.trim();
    if (!name) return;
    const task = await call<Task>("add_task", { name });
    taskDispatch({ type: "ADD_TASK", task });
    await startTask(task);
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      await handleAdd();
    }
  }

  return (
    <div className="relative border-b border-gray-700">
      <div className="flex items-center px-3 py-2 gap-2">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New task or search…"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full bg-gray-800 border border-gray-600 rounded-b shadow-lg z-10">
          {searchResults.map((task) => (
            <button
              key={task.id}
              onClick={() => startTask(task)}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 truncate"
            >
              {task.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
