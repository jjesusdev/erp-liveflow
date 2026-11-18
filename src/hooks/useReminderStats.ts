"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ReminderStats {
  enabled: boolean;
  pendingCount: number;
  message?: string;
  settings?: {
    reminderBeforeMinutes: number;
    reminderDays?: number;
  };
}

export interface UseReminderStatsOptions {
  /** Si es false, sólo `refresh()` dispara peticiones (vistas con botón manual). */
  autoFetch?: boolean;
  /** Intervalo del polling en ms. Por defecto, 30 segundos. */
  intervalMs?: number;
}

export interface UseReminderStatsResult {
  stats: ReminderStats | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function normalizeStats(payload: unknown): ReminderStats {
  const data = (payload ?? {}) as Record<string, unknown>;
  const settings = (data.settings ?? {}) as Record<string, unknown>;

  return {
    enabled: Boolean(data.enabled),
    pendingCount: Number(data.pendingCount) || 0,
    message: typeof data.message === "string" ? data.message : undefined,
    settings: data.settings
      ? {
          reminderBeforeMinutes: Number(settings.reminderBeforeMinutes) || 0,
          reminderDays:
            settings.reminderDays === undefined ? undefined : Number(settings.reminderDays) || 0,
        }
      : undefined,
  };
}

/**
 * Estadísticas de recordatorios con polling opcional.
 * Aborta la petición en curso al desmontar o al iniciar una nueva, y limpia el intervalo.
 */
export function useReminderStats({
  autoFetch = true,
  intervalMs = 30_000,
}: UseReminderStatsOptions = {}): UseReminderStatsResult {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/caja/reminders", { signal: controller.signal });
      if (!res.ok) throw new Error("No se pudieron cargar los recordatorios");
      const payload = await res.json();
      if (controller.signal.aborted) return;
      setStats(normalizeStats(payload));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return;

    void refresh();
    const interval = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [autoFetch, intervalMs, refresh]);

  return { stats, loading, error, refresh };
}
