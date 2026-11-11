/**
 * Cola de trabajos persistente basada en PostgreSQL.
 * Permite que múltiples instancias de la aplicación procesen jobs
 * de forma segura sin usar setInterval directo.
 *
 * Estados: PENDING -> CLAIMED -> COMPLETED/FAILED
 * Un job se considera disponible si status = PENDING y runAt <= now.
 * Al claiming, se marca como CLAIMED con claimedAt para evitar que
 * otra instancia lo procese.
 */

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { processScheduledCampaigns } from "./campaignSender";
import { processExpiredPaymentOrders } from "./orderExpirationWorker";
import { processPaymentReminders } from "./reminderWorker";
import { logActivity } from "./audit";

export type WorkerJobType = "CAMPAIGN_SEND" | "PAYMENT_EXPIRATION" | "PAYMENT_REMINDER";

export interface WorkerJobPayload {
  campaignId?: string;
  orgId?: string;
  reminderType?: "PENDING_ONLY" | "EXPIRED_ONLY" | "ALL_PRIOR";
  dryRun?: boolean;
  customMessage?: string | null;
}

const CLAIM_TTL_MS = 5 * 60 * 1000; // Un job claimado se libera después de 5 min

/**
 * Encola un trabajo para ser procesado por el worker.
 */
export async function enqueueJob(
  type: WorkerJobType,
  payload: WorkerJobPayload,
  opts: { orgId?: string; runAt?: Date; maxAttempts?: number } = {}
): Promise<string> {
  const job = await prisma.workerJob.create({
    data: {
      type,
      status: "PENDING",
      payload: payload as unknown as Prisma.InputJsonValue,
      orgId: opts.orgId ?? null,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 3,
    },
  });
  return job.id;
}

/**
 * Reclama el siguiente trabajo disponible (PENDING y runAt <= now).
 * Marca el job como CLAIMED para evitar doble procesamiento.
 * Retorna null si no hay trabajos disponibles.
 */
export async function claimNextJob(orgId?: string): Promise<{
  id: string;
  type: WorkerJobType;
  payload: WorkerJobPayload;
} | null> {
  const now = new Date();
  const job = await prisma.workerJob.findFirst({
    where: {
      status: "PENDING",
      runAt: { lte: now },
      ...(orgId ? { orgId } : {}),
    },
    orderBy: { runAt: "asc" },
  });

  if (!job) return null;

  const claimed = await prisma.workerJob.update({
    where: { id: job.id },
    data: {
      status: "CLAIMED",
      claimedAt: now,
      attempts: { increment: 1 },
    },
  });

  if (!claimed) return null; // Otra instancia lo reclamó primero

  return {
    id: job.id,
    type: job.type as WorkerJobType,
    payload: (job.payload as WorkerJobPayload) ?? {},
  };
}

/**
 * Marca un trabajo como completado.
 */
export async function completeJob(id: string): Promise<void> {
  await prisma.workerJob.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
}

/**
 * Marca un trabajo como fallado. Si se exceden los intentos, queda como FAILED.
 * De lo contrario, vuelve a PENDING para ser reintentado.
 */
export async function failJob(id: string, error: string): Promise<void> {
  const job = await prisma.workerJob.findUnique({ where: { id } });
  if (!job) return;

  const nextAttempts = job.attempts + 1;
  if (nextAttempts >= job.maxAttempts) {
    await prisma.workerJob.update({
      where: { id },
      data: {
        status: "FAILED",
        error,
        attempts: nextAttempts,
        completedAt: new Date(),
      },
    });
  } else {
    await prisma.workerJob.update({
      where: { id },
      data: {
        status: "PENDING",
        claimedAt: null,
        error,
        attempts: nextAttempts,
        runAt: new Date(Date.now() + 60_000 * nextAttempts), // backoff exponencial simple
      },
    });
  }
}

/**
 * Libera trabajos que fueron CLAIMED hace más de CLAIM_TTL_MS
 * (por si la instancia que los reclamó murió).
 */
export async function releaseStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - CLAIM_TTL_MS);
  const result = await prisma.workerJob.updateMany({
    where: {
      status: "CLAIMED",
      claimedAt: { lt: cutoff },
    },
    data: {
      status: "PENDING",
      claimedAt: null,
    },
  });
  return result.count;
}

/**
 * Procesa un job según su tipo. Retorna true si se procesó correctamente.
 */
export async function processJob(type: WorkerJobType, payload: WorkerJobPayload): Promise<void> {
  switch (type) {
    case "CAMPAIGN_SEND":
      if (payload.campaignId) {
        const { sendCampaign } = await import("./campaignSender");
        const result = await sendCampaign(payload.campaignId);
        if (!result.started && result.error) {
          throw new Error(result.error);
        }
      }
      break;

    case "PAYMENT_EXPIRATION": {
      const { processExpiredPaymentOrders } = await import("./orderExpirationWorker");
      const count = await processExpiredPaymentOrders();
      if (count > 0) {
        await logActivity({
          action: "WORKER_PAYMENT_EXPIRATION",
          details: { expiredCount: count },
        });
      }
      break;
    }

    case "PAYMENT_REMINDER": {
      const { processPaymentReminders } = await import("./reminderWorker");
      const result = await processPaymentReminders(
        payload.reminderType ?? "PENDING_ONLY",
        payload.customMessage ?? null,
        payload.dryRun ?? false,
        payload.orgId
      );
      await logActivity({
        action: "WORKER_PAYMENT_REMINDER",
        details: {
          sentCount: result.sentCount,
          totalPending: result.totalPending,
          reminderType: payload.reminderType,
          dryRun: payload.dryRun,
        },
      });
      break;
    }

    default:
      throw new Error(`Tipo de job desconocido: ${type}`);
  }
}

/**
 * Ejecuta un ciclo del worker: reclama un job disponible, lo procesa y lo marca como completado o fallado.
 * Los jobs periódicos (CAMPAIGN_SEND, PAYMENT_EXPIRATION) se auto-re-enqueuean para el siguiente ciclo.
 * Retorna true si se procesó al menos un job.
 */
export async function runWorkerCycle(orgId?: string): Promise<boolean> {
  // Liberar jobs abandonados
  await releaseStaleJobs();

  const job = await claimNextJob(orgId);
  if (!job) return false;

  try {
    await processJob(job.type, job.payload);
    await completeJob(job.id);

    // Auto-re-enqueuear jobs periódicos para el siguiente ciclo
    if (job.type === "CAMPAIGN_SEND") {
      await enqueueJob("CAMPAIGN_SEND", {}, { orgId, runAt: new Date(Date.now() + 60_000) });
    } else if (job.type === "PAYMENT_EXPIRATION") {
      await enqueueJob("PAYMENT_EXPIRATION", {}, { orgId, runAt: new Date(Date.now() + 45_000) });
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failJob(job.id, message);
    console.error(`[worker-queue] Error procesando job ${job.id}:`, message);
    return false;
  }
}

/**
 * Inicia el loop del worker. Se ejecuta continuamente procesando jobs
 * disponibles con un intervalo configurable.
 *
 * @param intervalMs Intervalo entre ciclos en ms (default: 10s)
 * @param orgId Si se especifica, solo procesa jobs de esa organización
 */
export function startWorkerLoop(intervalMs: number = 10_000, orgId?: string): NodeJS.Timeout {
  const timer = setInterval(async () => {
    try {
      const processed = await runWorkerCycle(orgId);
      if (!processed) {
        // Si no hay jobs, esperar un poco más antes del siguiente ciclo
        // El intervalo normal ya lo maneja setInterval
      }
    } catch (error) {
      console.error("[worker-queue] Error en el ciclo del worker:", error);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}
