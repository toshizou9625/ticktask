import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useError } from "../contexts/ErrorContext";

export function useTauriCommand() {
  const { showError } = useError();

  const call = useCallback(
    async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
      try {
        return await invoke<T>(command, args);
      } catch (err) {
        const message =
          typeof err === "string" ? err : "An unexpected error occurred";
        showError(message);
        throw err;
      }
    },
    [showError]
  );

  return { call };
}
