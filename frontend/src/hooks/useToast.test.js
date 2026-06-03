import { renderHook, act } from "@testing-library/react";
import { useToast } from "./useToast";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("starts with no toasts", () => {
  const { result } = renderHook(() => useToast());
  expect(result.current.toasts).toEqual([]);
});

test("toast.success adds a success toast", () => {
  const { result } = renderHook(() => useToast());
  act(() => { result.current.toast.success("Guardado!"); });
  expect(result.current.toasts).toHaveLength(1);
  expect(result.current.toasts[0].type).toBe("success");
  expect(result.current.toasts[0].message).toBe("Guardado!");
  expect(result.current.toasts[0].exiting).toBe(false);
});

test("toast.error adds an error toast", () => {
  const { result } = renderHook(() => useToast());
  act(() => { result.current.toast.error("Erro!"); });
  expect(result.current.toasts[0].type).toBe("error");
});

test("success toast marks exiting after 3500ms then removes after 250ms more", () => {
  const { result } = renderHook(() => useToast());
  act(() => { result.current.toast.success("Guardado!"); });

  act(() => { jest.advanceTimersByTime(3500); });
  expect(result.current.toasts[0].exiting).toBe(true);

  act(() => { jest.advanceTimersByTime(250); });
  expect(result.current.toasts).toHaveLength(0);
});

test("error toast marks exiting after 5000ms then removes after 250ms more", () => {
  const { result } = renderHook(() => useToast());
  act(() => { result.current.toast.error("Erro!"); });

  act(() => { jest.advanceTimersByTime(5000); });
  expect(result.current.toasts[0].exiting).toBe(true);

  act(() => { jest.advanceTimersByTime(250); });
  expect(result.current.toasts).toHaveLength(0);
});

test("removeToast marks toast as exiting immediately", () => {
  const { result } = renderHook(() => useToast());
  act(() => { result.current.toast.success("X"); });
  const id = result.current.toasts[0].id;

  act(() => { result.current.removeToast(id); });
  expect(result.current.toasts[0].exiting).toBe(true);

  act(() => { jest.advanceTimersByTime(250); });
  expect(result.current.toasts).toHaveLength(0);
});

test("multiple toasts coexist independently", () => {
  const { result } = renderHook(() => useToast());
  act(() => {
    result.current.toast.success("A");
    result.current.toast.error("B");
  });
  expect(result.current.toasts).toHaveLength(2);
});
