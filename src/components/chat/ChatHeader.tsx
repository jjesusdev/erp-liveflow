'use client';

import { X, ShoppingBag, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/liveflow/primitives';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onToggleCatalog: () => void;
  onOpenPayment: () => void;
  onClose: () => void;
}

export function ChatHeader({
  conversation,
  onToggleCatalog,
  onOpenPayment,
  onClose,
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 bg-card/80 backdrop-blur-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
          aria-hidden
        >
          {conversation?.lead?.name?.slice(0, 2).toUpperCase() || 'CL'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-xs font-bold text-foreground">
              {conversation?.lead?.name || conversation?.lead?.phone || 'Clienta'}
            </h2>
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
          <p className="truncate text-[11px] text-muted-foreground">{conversation?.lead?.phone}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleCatalog}
          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary transition-all"
        >
          <ShoppingBag className="size-3.5 text-primary" />
          Catalogo
        </button>

        <Button
          variant="success"
          size="sm"
          onClick={onOpenPayment}
          className="h-8 gap-1 font-bold text-xs"
        >
          <CreditCard className="size-3.5" />
          Cobro
        </Button>

        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
