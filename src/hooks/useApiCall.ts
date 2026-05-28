import { useCallback, useEffect, useRef, useState } from "react";

interface RunOptions<T> {
  onSuccess: (data: T) => void;
  onError?: (msg: string) => void;
  onFinally?: () => void;
}

export function useApiCall<T = unknown>(options?: { initialLoading?: boolean }) {
  const [loading, setLoading] = useState(options?.initialLoading ?? false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (fn: (signal: AbortSignal) => Promise<T>, opts: RunOptions<T>) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const data = await fn(controller.signal);
        if (!controller.signal.aborted) opts.onSuccess(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof DOMException && err.name === "TimeoutError"
            ? "Request timed out after 2 minutes. Please try again."
            : err instanceof Error
            ? err.message
            : "Request failed";
        setError(msg);
        opts.onError?.(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          opts.onFinally?.();
        }
      }
    },
    []
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setLoading(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  return { loading, error, run, cancel, clearError };
}
