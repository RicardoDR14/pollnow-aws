import { render, screen } from "@testing-library/react";
import ToastStack from "./ToastStack";

test("renders nothing when toasts array is empty", () => {
  const { container } = render(
    <ToastStack toasts={[]} removeToast={() => {}} />
  );
  expect(container.firstChild).toBeNull();
});

test("renders a success toast with the correct message and class", () => {
  const toasts = [
    { id: 1, type: "success", message: "Guardado!", exiting: false },
  ];
  render(<ToastStack toasts={toasts} removeToast={() => {}} />);
  const el = screen.getByText("Guardado!");
  expect(el).toBeInTheDocument();
  expect(el).toHaveClass("toast", "toast-success");
  expect(el).not.toHaveClass("exiting");
});

test("renders an error toast with the correct class", () => {
  const toasts = [
    { id: 2, type: "error", message: "Erro!", exiting: false },
  ];
  render(<ToastStack toasts={toasts} removeToast={() => {}} />);
  expect(screen.getByText("Erro!")).toHaveClass("toast-error");
});

test("applies exiting class when toast.exiting is true", () => {
  const toasts = [
    { id: 3, type: "success", message: "A sair", exiting: true },
  ];
  render(<ToastStack toasts={toasts} removeToast={() => {}} />);
  expect(screen.getByText("A sair")).toHaveClass("exiting");
});

test("renders multiple toasts", () => {
  const toasts = [
    { id: 1, type: "success", message: "Um", exiting: false },
    { id: 2, type: "error", message: "Dois", exiting: false },
  ];
  render(<ToastStack toasts={toasts} removeToast={() => {}} />);
  expect(screen.getByText("Um")).toBeInTheDocument();
  expect(screen.getByText("Dois")).toBeInTheDocument();
});
