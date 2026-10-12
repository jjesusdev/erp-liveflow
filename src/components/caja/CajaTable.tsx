"use client";

import { formatCurrency, formatDate, cn } from "@/lib/date-utils";
import { CreditCard, Copy, Check, Ban, Truck, Building2, CheckCircle2 } from "lucide-react";
import type { PaymentOrder } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  EXPIRED: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  REFUNDED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Pagado",
  SENT: "Por pagar",
  PENDING: "Pendiente",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

interface CajaTableProps {
  payments: PaymentOrder[];
  loading: boolean;
  busyId: string | null;
  copiedId: string | null;
  onCopyRef: (order: PaymentOrder) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function CajaTable({
  payments,
  loading,
  busyId,
  copiedId,
  onCopyRef,
  onUpdateStatus,
}: CajaTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[950px]">
        <thead>
          <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 text-left">Folio / Ref</th>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Concepto / Pedido</th>
            <th className="px-4 py-3 text-left">Monto</th>
            <th className="px-4 py-3 text-left">Metodo</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {payments.map((payment) => {
            const folio = payment.id.slice(0, 8).toUpperCase();
            const isTransfer = payment.provider === "TRANSFER" || !payment.provider;

            return (
              <tr key={payment.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-xs">
                  <button
                    onClick={() => onCopyRef(payment)}
                    className="inline-flex items-center gap-1 font-bold text-foreground hover:text-primary"
                    title="Copiar folio"
                  >
                    {folio}
                    {copiedId === payment.id ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground opacity-60" />
                    )}
                  </button>
                </td>

                <td className="px-4 py-3 font-medium">
                  <p className="truncate">{payment.lead?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">{payment.lead?.phone}</p>
                </td>

                <td className="px-4 py-3 text-foreground font-medium">{payment.concept}</td>

                <td className="px-4 py-3 font-bold text-foreground">
                  {formatCurrency(Number(payment.amount), payment.currency)}
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                    {isTransfer ? (
                      <>
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        Transferencia
                      </>
                    ) : payment.provider === "MERCADOPAGO" ? (
                      <>
                        <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                        MercadoPago
                      </>
                    ) : (
                      payment.provider
                    )}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      STATUS_STYLES[payment.status] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {STATUS_LABELS[payment.status] || payment.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(payment.createdAt)}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end items-center gap-1.5">
                    {payment.status !== "PAID" && (
                      <button
                        onClick={() => onUpdateStatus(payment.id, "PAID")}
                        disabled={busyId === payment.id}
                        className="inline-flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                        title="Aprobar pago de transferencia"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprobar
                      </button>
                    )}

                    {payment.status === "PAID" && payment.shipment && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        <Truck className="h-3 w-3" />
                        Envios OK
                      </span>
                    )}

                    {payment.status === "PENDING" && (
                      <button
                        onClick={() => onUpdateStatus(payment.id, "CANCELLED")}
                        disabled={busyId === payment.id}
                        title="Cancelar cobro"
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!loading && payments.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No se encontraron cobros con los filtros seleccionados.
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-muted-foreground">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
