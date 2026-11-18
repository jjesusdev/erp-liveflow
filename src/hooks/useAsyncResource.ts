"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Fuerza una nueva carga sin cambiar `load`. */
  refresh: () => void;
}

/**
 * Recurso asíncrono genérico con estados loading/error y abort automático.
 * `load` debe estar memoizado (p. ej. con `useCallback`) para no recargar en cada render.
 */
export function useAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    load(controller.signal)
      .then((result) => {
        if (active && !controller.signal.aborted) setData(result);
      })
      .catch((err: unknown) => {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active && !controller.signal.aborted) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [load, requestId]);

  const refresh = useCallback(() => setRequestId((id) => id + 1), []);

  return { data, loading, error, refresh };
}
