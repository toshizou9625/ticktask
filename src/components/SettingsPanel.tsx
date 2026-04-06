import { useContext, useState } from "react";
import { TaskListContext } from "../contexts/TaskListContext";
import { useTauriCommand } from "../hooks/useTauriCommand";
import { Task } from "../lib/types";

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const { tasks, outputDir, dispatch } = useContext(TaskListContext);
  const { call } = useTauriCommand();
  const [newTaskName, setNewTaskName] = useState("");

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
    setNewTaskName("");
  }

  async function handleDeleteTask(taskId: string) {
    await call("delete_task", { taskId });
    dispatch({ type: "DELETE_TASK", taskId });
  }

  return (
    <div className="absolute inset-0 bg-gray-900 z-20 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-white font-semibold text-sm">Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Task list */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-gray-400 text-xs uppercase mb-2">Task List</h3>
        <div className="space-y-1 mb-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between bg-gray-800 rounded px-3 py-1.5"
            >
              <span className="text-gray-200 text-sm truncate">{task.name}</span>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-gray-500 hover:text-red-400 text-xs ml-2 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-gray-500 text-xs">No tasks yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            placeholder="Add task…"
            className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-1.5 outline-none placeholder-gray-500"
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskName.trim()}
            className="px-3 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Save folder */}
      <div className="px-4 py-3">
        <h3 className="text-gray-400 text-xs uppercase mb-2">Save Folder</h3>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-gray-300 text-sm truncate bg-gray-800 rounded px-3 py-1.5">
            {outputDir ?? "Not set"}
          </span>
          <button
            onClick={handlePickFolder}
            className="px-3 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-200"
            title="Pick folder"
          >
            📁
          </button>
        </div>
      </div>
    </div>
  );
}
