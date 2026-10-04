'use client';

import { useState } from 'react';
import { ConversationCard } from './ConversationCard';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface KanbanColumnProps {
  title: string;
  color: string;
  status: string;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onDropConversation: (id: string, status: string) => void;
  onDragStart: (id: string) => void;
  draggingId: string | null;
}

export function KanbanColumn({
  title,
  color,
  status,
  conversations,
  onSelectConversation,
  onDropConversation,
  onDragStart,
  draggingId,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-3"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const id = event.dataTransfer.getData('text/plain');
        if (id) onDropConversation(id, status);
      }}
    >
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 shrink-0 rounded-full', color)} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{title}</h3>
        </div>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400">
          {conversations.length}
        </span>
      </div>

      <div
        className={cn(
          'flex-1 space-y-2 overflow-y-auto rounded-lg transition-all p-1',
          isOver && 'bg-emerald-500/10 ring-2 ring-emerald-500/40'
        )}
      >
        {conversations.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            conversation={conversation}
            draggingId={draggingId}
            onDragStart={onDragStart}
            onClick={() => onSelectConversation(conversation.id)}
          />
        ))}

        {conversations.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800/80 py-8 text-center text-xs text-zinc-500">
            {isOver ? 'Suelta aquí' : 'Sin chats'}
          </div>
        )}
      </div>
    </div>
  );
}