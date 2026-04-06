// Shared TypeScript type definitions for TickTask

export interface Task {
  id: string;
  name: string;
  lastUsedAt: string | null; // ISO 8601 datetime string or null
}

export interface SessionState {
  activeTaskId: string | null;
  startedAt: string | null; // ISO 8601 datetime string or null
  isPaused: boolean;
  todayAccumulated: Record<string, number>; // taskId -> accumulated seconds
}

export interface AppSettings {
  outputDir: string | null;
}

export interface AppStore {
  tasks: Task[];
  outputDir: string | null;
}

// Context types for React state management

export interface TimerContextValue {
  activeTaskId: string | null;
  startedAt: Date | null;
  isPaused: boolean;
  todayAccumulated: Record<string, number>;
  dispatch: React.Dispatch<TimerAction>;
}

export type TimerAction =
  | { type: "START"; taskId: string; startedAt: Date }
  | { type: "PAUSE"; accumulated: Record<string, number> }
  | { type: "RESUME"; startedAt: Date }
  | { type: "STOP_ALL" }
  | { type: "SYNC"; session: SessionState };

export interface TaskListContextValue {
  tasks: Task[];
  outputDir: string | null;
  dispatch: React.Dispatch<TaskListAction>;
}

export type TaskListAction =
  | { type: "SET_TASKS"; tasks: Task[] }
  | { type: "ADD_TASK"; task: Task }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "SET_OUTPUT_DIR"; outputDir: string }
  | { type: "UPDATE_LAST_USED"; taskId: string; lastUsedAt: string };
