import { useContext, useState } from "react";
import { TimerContext } from "../contexts/TimerContext";
import { useTauriCommand } from "../hooks/useTauriCommand";
import { SessionState } from "../lib/types";
import { SettingsPanel } from "./SettingsPanel";

export function ControlBar() {
  const { activeTaskId, isPaused, dispatch } = useContext(TimerContext);
  const { call } = useTauriCommand();
  const [showSettings, setShowSettings] = useState(false);

  async function handlePause() {
    if (isPaused) {
      const session = await call<SessionState>("resume_task");
      dispatch({ type: "RESUME", startedAt: new Date(session.startedAt!) });
      call("set_tray_state", { state: "active" }).catch(() => {});
    } else {
      const session = await call<SessionState>("pause_task");
      dispatch({ type: "PAUSE", accumulated: session.todayAccumulated });
      call("set_tray_state", { state: "paused" }).catch(() => {});
    }
  }

  async function handleStopAll() {
    await call<SessionState>("stop_all");
    dispatch({ type: "STOP_ALL" });
    call("set_tray_state", { state: "idle" }).catch(() => {});
  }

  return (
    <>
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={handlePause}
          disabled={!activeTaskId}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200"
        >
          {isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button
          onClick={handleStopAll}
          disabled={!activeTaskId}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200"
        >
          ⏹ Stop All
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="px-3 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-200"
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
