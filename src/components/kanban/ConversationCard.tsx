'use client';

import { timeAgo, formatCurrency, cn } from '@/lib/date-utils';
import { GripVertical, UserCheck } from 'lucide-react';
import type { Conversation } from '@/types';

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
  onDragStart: (id: string) => void;
  draggingId: string | null;
}

export function ConversationCard({
  conversation,
  onClick,
  onDragStart,
  draggingId,
}: ConversationCardProps) {
  const lastMessage = conversation.messages?.[0];
  const lastPayment = conversation.paymentOrders?.[0];
  const isLocked = Boolean(conversation.lockedBy);

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', conversation.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(conversation.id);
      }}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg border bg-card p-3 transition-all hover:bg-accent relative',
        draggingId === conversation.id && 'opacity-40',
        isLocked && 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />
        <div className="min-w-0 flex-1">
          {/* Indicador de Operadora Atendiendo en Vivo */}
          {isLocked && (
            <div className="mb-1.5 flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 w-fit">
              <UserCheck className="h-3 w-3" />
              <span>Atendiendo: {conversation.lockedBy?.operatorName}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-semibold text-foreground">
                  {conversation.lead?.name || conversation.lead?.phone || 'Sin nombre'}
                </p>
                {conversation.lead?.tier === 'VIP' && (
                  <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-black text-amber-600 dark:text-amber-400">
                    ★ VIP
                  </span>
                )}
                {conversation.lead?.tier === 'FREQUENT' && (
                  <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                    RECURRENTE
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.lead?.phone}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {conversation.lastMessageAt && timeAgo(conversation.lastMessageAt)}
            </span>
          </div>

          {lastMessage && (
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {lastMessage.type === 'IMAGE'
                ? '📷 Imagen'
                : lastMessage.type === 'PAYMENT_LINK'
                ? '🔗 Link de pago'
                : lastMessage.content}
            </p>
          )}

          {lastPayment && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  lastPayment.status === 'PAID'
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : lastPayment.status === 'SENT'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                }`}
              >
                {formatCurrency(Number(lastPayment.amount))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}