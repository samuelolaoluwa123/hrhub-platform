"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// Phase 14 — "Success state: Employee created successfully." Before
// this, every successful action in the app gave zero explicit
// feedback — a drawer just closed and the list silently refreshed
// underneath it. No component anywhere in the codebase showed a
// success or error banner. This is the one shared mechanism every
// drawer/form calls into instead of each inventing its own.
const ToastContext = createContext(null);

const TYPE_STYLE = {
  success: { bg: "#1a9c5f", icon: "✓" },
  error: { bg: "#cc3333", icon: "!" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "success") => {
      const id = ++nextId.current;
      setToasts((list) => [...list, { id, message, type }]);
      // Errors stay a beat longer — they're usually worth actually
      // reading, not just glancing at.
      window.setTimeout(() => dismiss(id), type === "error" ? 6000 : 4000);
    },
    [dismiss]
  );

  const api = useRef({
    showSuccess: (message) => show(message, "success"),
    showError: (message) => show(message, "error"),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-[calc(100%-2.5rem)] max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-lg animate-[toastIn_220ms_var(--ease-out)]"
            style={{ backgroundColor: TYPE_STYLE[t.type].bg }}
          >
            <span className="font-bold shrink-0" aria-hidden="true">
              {TYPE_STYLE[t.type].icon}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-80 hover:opacity-100 transition-opacity duration-150"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Throwing on a missing provider (rather than silently no-op'ing) so a
// component that forgets to render inside <ToastProvider> fails loudly
// in development instead of quietly never showing feedback in prod.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used inside <ToastProvider>");
  }
  return ctx;
}
