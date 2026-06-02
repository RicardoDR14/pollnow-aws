function ToastStack({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.exiting ? " exiting" : ""}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default ToastStack;
