'use client';

import { Save, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/liveflow/primitives';
import { money } from '@/lib/format';
import type { Conversation } from '@/types';
import type { AddressFormData } from '@/hooks/useChatPanel';

interface ProfileTabProps {
  conversation: Conversation | null;
  addressForm: AddressFormData;
  onAddressFormChange: (form: AddressFormData) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export function ProfileTab({
  conversation,
  addressForm,
  onAddressFormChange,
  onSave,
  saving,
}: ProfileTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h4 className="font-bold text-sm text-foreground">
              {conversation?.lead?.name || 'Clienta'}
            </h4>
            <p className="text-xs text-muted-foreground">{conversation?.lead?.phone}</p>
          </div>
          <TierBadge
            tier={
              conversation?.lead?.tier === 'VIP'
                ? 'vip'
                : conversation?.lead?.tier === 'FREQUENT'
                  ? 'recurrente'
                  : 'nueva'
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-muted/40 p-2.5">
            <span className="text-muted-foreground text-[11px] block">Compras Concretadas</span>
            <span className="font-black text-base text-foreground">
              {conversation?.lead?.totalPaidCount || 0}
            </span>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <span className="text-muted-foreground text-[11px] block">Total Gastado</span>
            <span className="font-black text-base text-emerald-500">
              {money(conversation?.lead?.totalSpent || 0)}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={onSave} className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-3.5" /> Notas Privadas entre Vendedoras
          </label>
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={saving}
            className="h-6 text-[11px]"
          >
            <Save className="size-3" /> Guardar
          </Button>
        </div>
        <textarea
          rows={3}
          value={addressForm.internalNotes}
          onChange={(e) => onAddressFormChange({ ...addressForm, internalNotes: e.target.value })}
          placeholder="Ej: Siempre pide talla M, prefiere envio por moto local..."
          className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </form>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <History className="size-3.5" /> Historial de Cobros
        </h5>
        <div className="space-y-1.5">
          {conversation?.paymentOrders?.map((po) => (
            <div
              key={po.id}
              className="flex items-center justify-between border-b border-border pb-1.5 text-xs"
            >
              <div>
                <p className="font-semibold text-foreground">{po.concept}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(po.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold">{money(Number(po.amount))}</span>
                <span className="block text-[10px] uppercase font-bold text-emerald-500">
                  {po.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
