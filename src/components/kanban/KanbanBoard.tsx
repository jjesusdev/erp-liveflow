'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { KanbanColumn } from './KanbanColumn';
import type { Conversation, ConversationStatus } from '@/types';

const COLUMNS: { id: ConversationStatus; title: string; color: string }[] = [
  { id: 'NEW', title: 'Nuevos', color: 'bg-blue-500' },
  { id: 'ATTENTION', title: 'En atención', color: 'bg-yellow-500' },
  { id: 'AWAITING_PAYMENT', title: 'Esperando pago', color: 'bg-orange-500' },
  { id: 'PAID', title: 'Pagados', color: 'bg-green-500' },
  { id: 'SHIPPED', title: 'Enviados', color: 'bg-purple-500' },
  { id: 'CLOSED', title: 'Cerrados', color: 'bg-slate-400' },
];

interface KanbanBoardProps {
  onSelectConversation: (id: string) => void;
}

export function KanbanBoard({ onSelectConversation }: KanbanBoardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const socket = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('No se pudieron cargar las conversaciones');
      const data = await res.json();
      setConversations(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const onConversationUpdated = (updated: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    };

    const onMessageNew = () => {
      fetchConversations();
    };

    const onLocksState = (locks: Array<{ conversationId: string; operatorName: string; socketId: string; lockedAt: string }>) => {
      const lockMap = new Map(locks.map((l) => [l.conversationId, l]));
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          lockedBy: lockMap.get(c.id) || null,
        }))
      );
    };

    const onChatLocked = (lock: { conversationId: string; operatorName: string; socketId: string; lockedAt: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === lock.conversationId ? { ...c, lockedBy: lock } : c))
      );
    };

    const onChatUnlocked = ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lockedBy: null } : c))
      );
    };

    socket.on('conversation:updated', onConversationUpdated);
    socket.on('message:new', onMessageNew);
    socket.on('chat:locks:state', onLocksState);
    socket.on('chat:locked', onChatLocked);
    socket.on('chat:unlocked', onChatUnlocked);

    return () => {
      socket.off('conversation:updated', onConversationUpdated);
      socket.off('message:new', onMessageNew);
      socket.off('chat:locks:state', onLocksState);
      socket.off('chat:locked', onChatLocked);
      socket.off('chat:unlocked', onChatUnlocked);
    };
  }, [socket, fetchConversations]);

  const moveConversation = async (id: string, status: string) => {
    const target = conversations.find((c) => c.id === id);
    setDraggingId(null);
    if (!target || target.status === status) return;

    // Actualizacion optimista: refleja el movimiento de inmediato.
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: status as ConversationStatus } : c))
    );

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('No se pudo actualizar la conversacion');
    } catch (err) {
      // Revierte si el servidor rechazo el cambio.
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? target : c))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            color={column.color}
            status={column.id}
            draggingId={draggingId}
            conversations={conversations.filter((c) => c.status === column.id)}
            onSelectConversation={onSelectConversation}
            onDropConversation={moveConversation}
            onDragStart={setDraggingId}
          />
        ))}
      </div>
    </div>
  );
}