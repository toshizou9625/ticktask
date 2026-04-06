import { useContext, useState } from "react";
import { TaskListContext } from "../contexts/TaskListContext";
import { useTauriCommand } from "../hooks/useTauriCommand";
import { Task } from "../lib/types";

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const { outputDir, dispatch } = useContext(TaskListContext);
  const { call } = useTauriCommand();
  const [newTaskName, setNewTaskName] = useState("");
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  async function handlePickFolder() {
    const picked = await call<string | null>("pick_folder");
    if (picked) {
      await call("set_output_dir", { dir: picked });
      dispatch({ type: "SET_OUTPUT_DIR", outputDir: picked });
    }
  }

  async function handleAddTask() {
    const name = newTaskName.trim();
    if (!name) return;
    const task = await call<Task>("add_task", { name });
    dispatch({ type: "ADD_TASK", task });
    setLocalTasks((prev) => [...prev, task]);
    setNewTaskName("");
  }

  async function handleDeleteTask(taskId: string) {
    await call("delete_task", { taskId });
    dispatch({ type: "DELETE_TASK", taskId });
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleGetStarted() {
    if (!outputDir) return;
    onComplete();
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <h1 className="text-white font-bold text-lg text-center">
        Welcome to TickTask
      </h1>

      {/* Folder picker */}
      <div>
        <label className="text-gray-400 text-xs uppercase block mb-2">
          Choose save folder
        </label>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-gray-300 text-sm truncate bg-gray-800 rounded px-3 py-2">
            {outputDir ?? "~/Obsidian/Daily"}
          </span>
          <button
            onClick={handlePickFolder}
            className="px-3 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            📁
          </button>
        </div>
      </div>

      {/* Task registration */}
      <div className="flex-1">
        <label className="text-gray-400 text-xs uppercase block mb-2">
          Register common tasks
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            placeholder="Task name…"
            className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none placeholder-gray-500"
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskName.trim()}
            className="px-3 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white"
          >
            Add
          </button>
        </div>
        <div className="space-y-1">
          {localTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between bg-gray-800 rounded px-3 py-1.5"
            >
              <span className="text-gray-200 text-sm truncate">
                • {task.name}
              </span>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-gray-500 hover:text-red-400 text-xs ml-2 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Get started */}
      <button
        onClick={handleGetStarted}
        disabled={!outputDir}
        className="w-full py-2.5 rounded text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
      >
        Get Started
      </button>
    </div>
  );
}
