'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Conversation } from '@/types';
import type { AddressFormData } from '@/hooks/useChatPanel';

interface PackingTabProps {
  conversation: Conversation | null;
  addressForm: AddressFormData;
}

export function PackingTab({ conversation, addressForm }: PackingTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          Ficha de Empaque para Paquete
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={() => window.print()}
          className="h-7 text-xs"
        >
          <Printer className="size-3.5" /> Imprimir Etiqueta
        </Button>
      </div>

      <div className="rounded-xl border-2 border-dashed border-zinc-700 p-4 bg-zinc-950 text-zinc-100 space-y-3 shadow-md">
        <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
          <div>
            <h2 className="font-black text-xs uppercase tracking-wide text-emerald-400">
              PAQUETE LIVE SHOPPING
            </h2>
            <p className="text-[11px] text-zinc-300">
              Cliente: <strong>{addressForm.name || conversation?.lead?.phone}</strong>
            </p>
            <p className="text-[11px] text-zinc-400">
              Tel: <strong>{conversation?.lead?.phone}</strong>
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold border border-zinc-700 bg-zinc-900 px-2 py-0.5 rounded text-emerald-400">
              {conversation?.paymentOrders?.[0]?.id?.slice(0, 8)?.toUpperCase() || 'REF-LIVE'}
            </span>
          </div>
        </div>

        <div className="text-xs space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-zinc-500">Direccion de Envio:</p>
          <p className="font-bold text-zinc-100">
            {addressForm.addressStreet} {addressForm.addressNumber}
          </p>
          <p className="text-zinc-300">
            {addressForm.addressColonia ? `Col. ${addressForm.addressColonia}, ` : ''}
            {addressForm.addressCity} {addressForm.addressState}
          </p>
          <p className="font-bold text-zinc-400">CP: {addressForm.addressZipCode || 'N/A'}</p>
          {addressForm.addressNotes && (
            <p className="text-[11px] text-zinc-400 italic mt-1 bg-zinc-900 p-1.5 rounded border border-zinc-800">
              Ref: {addressForm.addressNotes}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-2 text-[11px]">
          <p className="font-bold text-zinc-400">Prendas:</p>
          <p className="font-semibold text-emerald-300">
            {conversation?.paymentOrders?.[0]?.concept || 'Prendas del Live'}
          </p>
        </div>
      </div>
    </div>
  );
}
