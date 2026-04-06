import React, { createContext, useCallback, useContext, useState } from "react";

interface ErrorContextValue {
  showError: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextValue>({ showError: () => {} });

export function useError() {
  return useContext(ErrorContext);
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-800 text-white text-xs rounded px-3 py-2 z-50 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white shrink-0"
          >
            ×
          </button>
        </div>
      )}
    </ErrorContext.Provider>
  );
}
