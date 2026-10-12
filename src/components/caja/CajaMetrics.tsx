"use client";

import { formatCurrency } from "@/lib/date-utils";
import { CheckCircle, Building2, Clock, Wallet } from "lucide-react";

interface CajaMetricsProps {
  totalPaid: number;
  totalTransferPaid: number;
  totalPending: number;
  totalOrders: number;
  paidCount: number;
  pendingCount: number;
}

export function CajaMetrics({
  totalPaid,
  totalTransferPaid,
  totalPending,
  totalOrders,
  paidCount,
  pendingCount,
}: CajaMetricsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Total Cobrado</span>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
        <p className="mt-2 text-2xl font-black text-green-600">{formatCurrency(totalPaid)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{paidCount} pedidos confirmados</p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">En Transferencias</span>
          <Building2 className="h-4 w-4 text-emerald-600" />
        </div>
        <p className="mt-2 text-2xl font-black text-foreground">
          {formatCurrency(totalTransferPaid)}
        </p>
        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          Sin comisiones de pasarelas
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Por Cobrar</span>
          <Clock className="h-4 w-4 text-orange-600" />
        </div>
        <p className="mt-2 text-2xl font-black text-orange-600">{formatCurrency(totalPending)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {pendingCount} pedidos esperando transferencia
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">Total Ordenes</span>
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-2 text-2xl font-black text-foreground">{totalOrders}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Tickets emitidos en el periodo</p>
      </div>
    </div>
  );
}
