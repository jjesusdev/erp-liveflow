'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/lib/socket';
import { makeReference, money } from '@/lib/format';
import { InboxColumn } from './inbox-column';
import { ChatColumn } from './chat-column';
import { CustomerPanel } from './customer-panel';
import { ChargeModal } from './charge-modal';
import { LiveStatusBar } from './live-status-bar';
import type { Conversation as UIConversation, Message as UIMessage, Product as UIProduct, ConversationStatus as UIStatus } from '@/lib/liveflow-data';
import type { Conversation as DBConversation, Message as DBMessage, LiveSession } from '@/types';

function mapDBStatusToUI(status: string): UIStatus {
  switch (status) {
    case 'NEW':
      return 'nuevos';
    case 'ATTENTION':
      return 'atencion';
    case 'AWAITING_PAYMENT':
      return 'esperando';
    case 'PAID':
      return 'pagados';
    case 'SHIPPED':
      return 'despachados';
    default:
      return 'nuevos';
  }
}

export function Workspace() {
  const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [bags, setBags] = useState<Record<string, UIProduct[]>>({});
  const [chargeOpen, setChargeOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data: DBConversation[] = await res.json();
        setDbConversations(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}`);
      if (res.ok) {
        const data: DBMessage[] = await res.json();
        setDbMessages(data);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchActiveLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live-sessions?active=true');
      if (res.ok) {
        const sessions = await res.json();
        if (Array.isArray(sessions) && sessions.length > 0) {
          setActiveSession(sessions[0]);
        } else {
          setActiveSession(null);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchActiveLive();
  }, [fetchConversations, fetchActiveLive]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      if (socket) {
        socket.emit('chat:lock', { conversationId: selectedId, operatorName: 'Mariana' });
      }
      return () => {
        if (socket && selectedId) {
          socket.emit('chat:unlock', { conversationId: selectedId });
        }
      };
    }
  }, [selectedId, fetchMessages, socket]);

  useEffect(() => {
    if (!socket) return;

    const onMessageNew = (msg: DBMessage) => {
      if (msg.conversationId === selectedId) {
        setDbMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      fetchConversations();
    };

    const onConversationUpdated = (updated: DBConversation) => {
      setDbConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    };

    const onPaymentConfirmed = () => {
      fetchConversations();
      if (selectedId) fetchMessages(selectedId);
      fetchActiveLive();
    };

    const onLiveStarted = (session: LiveSession) => setActiveSession(session);
    const onLiveUpdated = (session: LiveSession) => setActiveSession(session.status === 'ENDED' ? null : session);

    socket.on('message:new', onMessageNew);
    socket.on('conversation:updated', onConversationUpdated);
    socket.on('payment:confirmed', onPaymentConfirmed);
    socket.on('payment:updated', onPaymentConfirmed);
    socket.on('live:session:started', onLiveStarted);
    socket.on('live:session:updated', onLiveUpdated);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('conversation:updated', onConversationUpdated);
      socket.off('payment:confirmed', onPaymentConfirmed);
      socket.off('payment:updated', onPaymentConfirmed);
      socket.off('live:session:started', onLiveStarted);
      socket.off('live:session:updated', onLiveUpdated);
    };
  }, [socket, selectedId, fetchConversations, fetchMessages, fetchActiveLive]);

  // Convert DB conversations to UI conversations
  const conversations: UIConversation[] = useMemo(() => {
    return dbConversations.map((c) => {
      const lastMsg = c.messages?.[0];
      const pendingPayment = c.paymentOrders?.find((p) => p.status === 'PENDING' || p.status === 'SENT');

      const minutesAgo = c.lastMessageAt
        ? Math.max(0, Math.floor((Date.now() - new Date(c.lastMessageAt).getTime()) / 60000))
        : 0;

      const tier = c.lead?.tier === 'VIP' ? 'vip' : c.lead?.tier === 'FREQUENT' ? 'recurrente' : 'nueva';

      return {
        id: c.id,
        name: c.lead?.name || c.lead?.phone || 'Sin nombre',
        phone: c.lead?.phone || '',
        tier,
        status: mapDBStatusToUI(c.status),
        lockedBy: c.lockedBy?.operatorName,
        minutesAgo,
        preview: lastMsg ? (lastMsg.type === 'IMAGE' ? '📷 Imagen' : lastMsg.content || '') : 'Sin mensajes',
        unread: 0,
        totalSpent: c.lead?.totalSpent || 0,
        paidOrders: c.lead?.totalPaidCount || 0,
        apartado: pendingPayment ? { amount: Number(pendingPayment.amount), expiresInSec: 25 * 60 } : undefined,
      };
    });
  }, [dbConversations]);

  const currentConv = conversations.find((c) => c.id === selectedId) || conversations[0];
  const currentDBConv = dbConversations.find((c) => c.id === selectedId);

  // Convert DB messages to UI messages
  const messages: UIMessage[] = useMemo(() => {
    return dbMessages.map((m) => {
      const time = new Date(m.sentAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      const from = m.direction === 'OUTBOUND' ? ('out' as const) : ('in' as const);

      if (m.type === 'IMAGE' && m.mediaUrl) {
        const isReceipt = m.isPossibleReceipt || m.direction === 'INBOUND';
        if (isReceipt && currentConv?.apartado) {
          return {
            id: m.id,
            kind: 'receipt',
            from: 'in',
            src: m.mediaUrl,
            amount: currentConv.apartado.amount,
            time,
            approved: currentConv.status === 'pagados',
          };
        }
        return {
          id: m.id,
          kind: 'image',
          from,
          src: m.mediaUrl,
          caption: m.content || undefined,
          time,
        };
      }

      if (m.type === 'AUDIO' && m.mediaUrl) {
        return {
          id: m.id,
          kind: 'voice',
          from,
          durationSec: 15,
          time,
        };
      }

      return {
        id: m.id,
        kind: 'text',
        from,
        text: m.content || '',
        time,
      };
    });
  }, [dbMessages, currentConv]);

  const bag = bags[selectedId] ?? [];
  const reference = selectedId ? selectedId.slice(0, 8).toUpperCase() : makeReference(12345);

  const approve = async () => {
    const pendingPayment = currentDBConv?.paymentOrders?.find((p) => p.status === 'PENDING' || p.status === 'SENT');
    if (!pendingPayment) {
      toast.error('No hay cobro pendiente para aprobar');
      return;
    }

    try {
      const res = await fetch(`/api/payment-orders/${pendingPayment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });
      if (!res.ok) throw new Error('Error al aprobar');
      toast.success('Pago aprobado', { description: `${currentConv?.name} · ${money(Number(pendingPayment.amount))} MXN` });
      fetchConversations();
      fetchMessages(selectedId);
    } catch {
      toast.error('No se pudo aprobar el pago');
    }
  };

  const addProduct = (p: UIProduct) => {
    setBags((b) => ({ ...b, [selectedId]: [...(b[selectedId] ?? []), p] }));
    toast.success(`${p.name} agregado`, { description: 'Prenda sumada a la Bolsa Live' });
  };

  const send = async (text: string, image?: string) => {
    if (!selectedId) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          content: text || undefined,
          type: image ? 'IMAGE' : 'TEXT',
          mediaUrl: image || undefined,
        }),
      });
      if (res.ok) {
        fetchMessages(selectedId);
      }
    } catch {
      toast.error('Error al enviar mensaje');
    }
  };

  const onChargeSent = () => {
    fetchConversations();
    fetchMessages(selectedId);
  };

  const startLive = async () => {
    const title = prompt('Título del Live:');
    if (!title) return;
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, platform: 'TIKTOK' }),
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        toast.success('Sesión Live iniciada');
      }
    } catch {
      toast.error('Error al iniciar Live');
    }
  };

  const endLive = async () => {
    if (!activeSession || !confirm('¿Finalizar Live actual?')) return;
    try {
      await fetch(`/api/live-sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      });
      setActiveSession(null);
      toast.success('Sesión Live finalizada');
    } catch {
      toast.error('Error al finalizar Live');
    }
  };

  const seedDemo = async () => {
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        toast.success('5 chats de prueba cargados');
        fetchConversations();
      }
    } catch {
      toast.error('Error cargando demo');
    }
  };

  if (loading && dbConversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <LiveStatusBar
        activeSession={activeSession}
        onStartLive={startLive}
        onEndLive={endLive}
      />
      <div className="flex min-h-0 flex-1">
        {conversations.length > 0 && currentConv ? (
          <>
            <InboxColumn
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSeedDemo={seedDemo}
            />
            <ChatColumn
              conversation={currentConv}
              messages={messages}
              deadline={currentConv.apartado ? Date.now() + 25 * 60 * 1000 : null}
              onApprove={approve}
              onOpenCharge={() => setChargeOpen(true)}
              onSend={send}
              onAddProduct={addProduct}
            />
            <CustomerPanel
              conversation={currentConv}
              bag={bag}
              folio={`LF-${reference}`}
            />
          </>
        ) : (
          <>
            <InboxColumn
              conversations={[]}
              selectedId=""
              onSelect={setSelectedId}
              onSeedDemo={seedDemo}
            />
            <ChatColumn
              conversation={null}
              messages={[]}
              deadline={null}
              onApprove={() => {}}
              onOpenCharge={() => {}}
              onSend={send}
              onAddProduct={addProduct}
            />
            <CustomerPanel
              conversation={null}
              bag={[]}
              folio="LF-DEMO8941"
            />
          </>
        )}
      </div>

      {currentConv && (
        <ChargeModal
          key={`${selectedId}-${chargeOpen}`}
          open={chargeOpen}
          onOpenChange={setChargeOpen}
          conversation={currentConv}
          bag={bag}
          onRemoveFromBag={(i) =>
            setBags((b) => ({ ...b, [selectedId]: bag.filter((_, idx) => idx !== i) }))
          }
          reference={reference}
          onSent={onChargeSent}
        />
      )}
    </>
  );
}