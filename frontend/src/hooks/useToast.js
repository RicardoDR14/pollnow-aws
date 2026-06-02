import { useState, useCallback } from "react";

const DURATION = { success: 3500, error: 5000 };
const EXIT_MS = 250;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const addToast = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
      setTimeout(() => removeToast(id), DURATION[type]);
    },
    [removeToast]
  );

  const toast = {
    success: (message) => addToast("success", message),
    error: (message) => addToast("error", message),
  };

  return { toasts, removeToast, toast };
}
