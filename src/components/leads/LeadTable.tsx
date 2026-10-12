'use client';

import { cn } from '@/lib/utils';
import { ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, TierBadge } from '@/components/liveflow/primitives';
import { money } from '@/lib/format';
import { formatDate } from '@/lib/date-utils';
import type { Lead, PaymentStatus } from '@/types';

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'transit' | 'pending' | 'live' | 'neutral'> = {
  PAID: 'success',
  SENT: 'transit',
  PENDING: 'pending',
  EXPIRED: 'neutral',
  CANCELLED: 'live',
  REFUNDED: 'pending',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Pagado',
  SENT: 'Por pagar',
  PENDING: 'Pendiente',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

interface LeadTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function LeadTable({ leads, selectedLead, loading, onSelect }: LeadTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              <th scope="col" className="px-3 py-2.5">Clienta</th>
              <th scope="col" className="px-3 py-2.5">Nivel</th>
              <th scope="col" className="px-3 py-2.5">Origen</th>
              <th scope="col" className="px-3 py-2.5 text-right">Pedidos</th>
              <th scope="col" className="px-3 py-2.5 text-right">Total</th>
              <th scope="col" className="w-8 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const tier = lead.tier === 'VIP' ? 'vip' : lead.tier === 'FREQUENT' ? 'recurrente' : 'nueva';

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelect(lead.id)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected ? 'bg-muted/60 font-medium' : 'hover:bg-muted/30'
                  )}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-foreground">{lead.name || 'Sin nombre'}</p>
                    <p className="text-[11px] text-muted-foreground">{lead.phone}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <TierBadge tier={tier} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize text-[11px]">
                    {lead.source?.replace('_', ' ') || 'WhatsApp'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">
                    {lead.totalPaidCount || 0}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-foreground">
                    {money(lead.totalSpent || 0)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-muted-foreground">
                    <ChevronRight className={cn('size-3.5 transition-opacity', isSelected ? 'opacity-100 text-foreground' : 'opacity-30')} />
                  </td>
                </tr>
              );
            })}

            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                  No hay clientas en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LeadDetailPanelProps {
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
}

export function LeadDetailPanel({ lead, onEdit }: LeadDetailPanelProps) {
  if (!lead) {
    return (
      <aside aria-label="Ficha de la clienta" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs">
        <p className="p-8 text-center text-xs text-muted-foreground">Selecciona una clienta para ver su ficha.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Ficha de la clienta" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {lead.name || 'Clienta'}
            </h2>
            <TierBadge tier={lead.tier === 'VIP' ? 'vip' : lead.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(lead)} className="h-7 px-2 text-xs">
          <Pencil className="size-3" aria-hidden />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-border bg-background p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total gastado</p>
          <p className="mt-0.5 text-sm font-bold text-success">{money(lead.totalSpent || 0)}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pedidos pagados</p>
          <p className="mt-0.5 text-sm font-bold">{lead.totalPaidCount || 0}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Direccion de entrega</p>
        <div className="rounded-md border border-border bg-background p-3">
          {lead.addressStreet ? (
            <>
              <p className="font-medium text-foreground">
                {lead.addressStreet} {lead.addressNumber}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {lead.addressColonia ? `Col. ${lead.addressColonia}, ` : ''}
                {lead.addressCity} {lead.addressState} · CP {lead.addressZipCode}
              </p>
              {lead.addressNotes && (
                <p className="mt-1.5 border-t border-border pt-1 text-[11px] text-muted-foreground italic">
                  Ref: {lead.addressNotes}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground italic">Sin direccion capturada aun.</p>
          )}
        </div>
      </div>

      {lead.internalNotes && (
        <div className="flex flex-col gap-1.5 text-xs">
          <p className="text-[10px] font-medium uppercase tracking-wider text-pending">Notas privadas del equipo</p>
          <div className="rounded-md border border-pending/20 bg-pending/5 p-2.5 text-xs text-foreground leading-relaxed">
            {lead.internalNotes}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 text-xs">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ultimos cobros</p>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background">
          {(lead.paymentOrders || []).map((po) => (
            <li key={po.id} className="flex items-center justify-between p-2.5">
              <div className="min-w-0 pr-2">
                <p className="truncate font-medium text-foreground">{po.concept}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(po.createdAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-semibold text-foreground">{money(Number(po.amount))}</span>
                <div className="mt-0.5">
                  <Badge tone={PAYMENT_TONE[po.status]}>
                    {PAYMENT_LABEL[po.status] || po.status}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
          {(lead.paymentOrders || []).length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground">Sin compras registradas.</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
