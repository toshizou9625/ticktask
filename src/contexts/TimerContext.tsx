import React, { createContext, useReducer } from "react";
import { SessionState, TimerAction, TimerContextValue } from "../lib/types";

const initialState: TimerContextValue = {
  activeTaskId: null,
  startedAt: null,
  isPaused: false,
  todayAccumulated: {},
  dispatch: () => {},
};

export const TimerContext = createContext<TimerContextValue>(initialState);

function timerReducer(
  state: TimerContextValue,
  action: TimerAction
): TimerContextValue {
  switch (action.type) {
    case "START":
      return {
        ...state,
        activeTaskId: action.taskId,
        startedAt: action.startedAt,
        isPaused: false,
      };
    case "PAUSE":
      return {
        ...state,
        startedAt: null,
        isPaused: true,
        todayAccumulated: action.accumulated,
      };
    case "RESUME":
      return {
        ...state,
        startedAt: action.startedAt,
        isPaused: false,
      };
    case "STOP_ALL":
      return {
        ...state,
        activeTaskId: null,
        startedAt: null,
        isPaused: false,
        todayAccumulated: {},
      };
    case "SYNC": {
      const s: SessionState = action.session;
      return {
        ...state,
        activeTaskId: s.activeTaskId,
        startedAt: s.startedAt ? new Date(s.startedAt) : null,
        isPaused: s.isPaused,
        todayAccumulated: s.todayAccumulated,
      };
    }
    default:
      return state;
  }
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, initialState);

  return (
    <TimerContext.Provider value={{ ...state, dispatch }}>
      {children}
    </TimerContext.Provider>
  );
}
