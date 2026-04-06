import React, { createContext, useReducer } from "react";
import { Task, TaskListAction, TaskListContextValue } from "../lib/types";

const initialState: TaskListContextValue = {
  tasks: [],
  outputDir: null,
  dispatch: () => {},
};

export const TaskListContext =
  createContext<TaskListContextValue>(initialState);

function taskListReducer(
  state: TaskListContextValue,
  action: TaskListAction
): TaskListContextValue {
  switch (action.type) {
    case "SET_TASKS":
      return { ...state, tasks: action.tasks };
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.taskId),
      };
    case "SET_OUTPUT_DIR":
      return { ...state, outputDir: action.outputDir };
    case "UPDATE_LAST_USED":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, lastUsedAt: action.lastUsedAt } : t
        ),
      };
    default:
      return state;
  }
}

export function TaskListProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskListReducer, initialState);

  return (
    <TaskListContext.Provider value={{ ...state, dispatch }}>
      {children}
    </TaskListContext.Provider>
  );
}

/** MRU-sorted top 8 tasks */
export function useTopTasks(tasks: Task[]): Task[] {
  return [...tasks]
    .sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) {
        return (
          new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        );
      }
      if (a.lastUsedAt) return -1;
      if (b.lastUsedAt) return 1;
      return 0;
    })
    .slice(0, 8);
}
