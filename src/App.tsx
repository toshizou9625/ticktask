import { useContext, useEffect, useState } from "react";
import "./App.css";
import { TaskListContext, TaskListProvider } from "./contexts/TaskListContext";
import { TimerContext, TimerProvider } from "./contexts/TimerContext";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import { ActiveTask } from "./components/ActiveTask";
import { ControlBar } from "./components/ControlBar";
import { Onboarding } from "./components/Onboarding";
import { TaskBoard } from "./components/TaskBoard";
import { TaskInput } from "./components/TaskInput";
import { useTauriCommand } from "./hooks/useTauriCommand";
import { SessionState, Task } from "./lib/types";

function AppInner() {
  const { outputDir, dispatch: taskDispatch } = useContext(TaskListContext);
  const { dispatch: timerDispatch } = useContext(TimerContext);
  const { call } = useTauriCommand();
  const { showError } = useError();
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    async function init() {
      const tasks = await call<Task[]>("get_tasks");
      taskDispatch({ type: "SET_TASKS", tasks });

      const dir = await call<string | null>("get_output_dir");
      if (dir) {
        taskDispatch({ type: "SET_OUTPUT_DIR", outputDir: dir });
      } else {
        setOnboarding(true);
      }

      const session = await call<SessionState>("get_session");
      timerDispatch({ type: "SYNC", session });

      setReady(true);
    }
    init().catch((err) => {
      showError(
        typeof err === "string" ? err : "Failed to initialize app"
      );
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (onboarding || !outputDir) {
    return <Onboarding onComplete={() => setOnboarding(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative overflow-hidden">
      <ActiveTask />
      <TaskBoard />
      <TaskInput />
      <ControlBar />
    </div>
  );
}

export default function App() {
  return (
    <ErrorProvider>
      <TaskListProvider>
        <TimerProvider>
          <AppInner />
        </TimerProvider>
      </TaskListProvider>
    </ErrorProvider>
  );
}
